import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

// Default alert sound (a short chime) as a data URI so we don't need external files
const DEFAULT_ALERT_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export default function SaweriaAlert({ streamKey, onAlertStart, onAlertEnd }) {
    const [alert, setAlert] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef(null);
    const socketRef = useRef(null);
    const audioRef = useRef(null);

    // Duration to display the alert (ms)
    const ALERT_DURATION = 8000;

    const showAlert = useCallback((data) => {
        // Play sound
        try {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => { });
            }
        } catch (e) { }

        // Set alert data
        setAlert({
            donator: data.donator || data.name || 'Someone',
            amount: data.amount || 0,
            message: data.message || data.msg || '',
            currency: data.currency || 'IDR',
            media: data.media || null,
        });
        setIsVisible(true);
        onAlertStart?.();

        // Clear previous timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Hide after duration
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            onAlertEnd?.();
            setTimeout(() => setAlert(null), 500); // wait for fade out animation
        }, ALERT_DURATION);
    }, [onAlertStart, onAlertEnd]);

    useEffect(() => {
        if (!streamKey) return;

        // Try connecting to Saweria's socket.io server
        // Saweria uses their events endpoint with the stream key
        const socket = io('https://events.saweria.co', {
            query: { streamKey },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 3000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Saweria] Connected to WebSocket');
        });

        socket.on('donations', (data) => {
            console.log('[Saweria] Donation received:', data);
            // data can be an array or single object
            const donations = Array.isArray(data) ? data : [data];
            donations.forEach((donation, index) => {
                setTimeout(() => showAlert(donation), index * (ALERT_DURATION + 1000));
            });
        });

        socket.on('disconnect', () => {
            console.log('[Saweria] Disconnected from WebSocket');
        });

        socket.on('connect_error', (err) => {
            console.warn('[Saweria] Connection error:', err.message);
        });

        return () => {
            socket.disconnect();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [streamKey, showAlert]);

    // Format currency
    const formatAmount = (amount, currency) => {
        try {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: currency || 'IDR',
                minimumFractionDigits: 0,
            }).format(amount);
        } catch {
            return `Rp ${amount.toLocaleString()}`;
        }
    };

    return (
        <>
            {/* Hidden audio element for alert sound */}
            <audio ref={audioRef} src={DEFAULT_ALERT_SOUND} preload="auto" />

            {/* Alert overlay */}
            {alert && (
                <div
                    className={`absolute inset-0 z-30 flex items-center justify-center p-4 transition-all duration-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}
                >
                    <div className="relative max-w-[360px] w-full">
                        {/* Glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl blur-lg opacity-75 animate-pulse" />

                        {/* Card */}
                        <div className="relative bg-neutral-900/95 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-6 shadow-2xl">
                            {/* Coin animation */}
                            <div className="flex justify-center mb-3">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/50 animate-bounce">
                                    <span className="text-3xl">💰</span>
                                </div>
                            </div>

                            {/* Donator name */}
                            <h3 className="text-center text-xl font-bold bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent mb-1">
                                {alert.donator}
                            </h3>

                            {/* Amount */}
                            <p className="text-center text-2xl font-extrabold text-white mb-3">
                                {formatAmount(alert.amount, alert.currency)}
                            </p>

                            {/* Message */}
                            {alert.message && (
                                <div className="bg-black/40 rounded-xl p-3 border border-white/10">
                                    <p className="text-center text-white/90 text-sm leading-relaxed">
                                        {alert.message}
                                    </p>
                                </div>
                            )}

                            {/* Media (GIF/Image) */}
                            {alert.media && alert.media.src && (
                                <div className="mt-3 flex justify-center">
                                    <img
                                        src={alert.media.src}
                                        alt="Donation media"
                                        className="max-h-24 rounded-lg"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

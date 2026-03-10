import { useState, useEffect, useCallback, useRef } from 'react';

// Default alert sound
const DEFAULT_ALERT_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export default function SaweriaAlert({ streamKey, onAlertStart, onAlertEnd }) {
    const [alert, setAlert] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef(null);
    const socketRef = useRef(null);
    const audioRef = useRef(null);
    const reconnectRef = useRef(null);
    const onAlertStartRef = useRef(onAlertStart);
    const onAlertEndRef = useRef(onAlertEnd);

    // Keep refs in sync with latest props
    useEffect(() => { onAlertStartRef.current = onAlertStart; }, [onAlertStart]);
    useEffect(() => { onAlertEndRef.current = onAlertEnd; }, [onAlertEnd]);

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
            donator: data.donator || data.name || data.emitter_name || 'Someone',
            amount: data.amount || data.amount_raw || 0,
            message: data.message || data.msg || '',
            currency: data.currency || 'IDR',
            media: data.media || null,
        });
        setIsVisible(true);
        onAlertStartRef.current?.();

        // Clear previous timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Hide after duration
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            onAlertEndRef.current?.();
            setTimeout(() => setAlert(null), 500); // wait for fade out animation
        }, ALERT_DURATION);
    }, []);

    useEffect(() => {
        if (!streamKey) return;

        const connect = () => {
            // Saweria uses raw WebSockets, NOT socket.io
            const wsUrl = `wss://events.saweria.co/stream?streamKey=${streamKey}`;
            console.log('[Saweria] Connecting to:', wsUrl);

            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.addEventListener('open', () => {
                console.log('[Saweria] WebSocket connected!');
            });

            ws.addEventListener('message', (event) => {
                console.log('[Saweria] Message received:', event.data);
                try {
                    const payload = JSON.parse(event.data);
                    const alerts = payload.data || [];
                    if (alerts.length > 0) {
                        // Show each alert sequentially
                        alerts.forEach((donation, index) => {
                            setTimeout(() => showAlert(donation), index * (ALERT_DURATION + 1000));
                        });
                    }
                } catch (e) {
                    console.warn('[Saweria] Failed to parse message:', e);
                }
            });

            ws.addEventListener('close', (event) => {
                console.log('[Saweria] WebSocket disconnected, reconnecting in 5s...', event.code, event.reason);
                // Auto-reconnect after 5 seconds
                reconnectRef.current = setTimeout(() => {
                    connect();
                }, 5000);
            });

            ws.addEventListener('error', (err) => {
                console.warn('[Saweria] WebSocket error:', err);
                ws.close();
            });
        };

        connect();

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
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

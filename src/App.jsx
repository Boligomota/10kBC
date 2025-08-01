import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, serverTimestamp, getDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';

// --- Íconos SVG ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>;
const ResetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm1 14a1 1 0 011-1h3.001a5.002 5.002 0 004.002-7.999 1 1 0 111.885-.666A7.002 7.002 0 014.399 15.899V18a1 1 0 11-2 0v-5a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const ChevronUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;

// --- Configuración de Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyA1Nd8tFVOmI4ieQ0kCP2-NSrRyld6IAeI",
  authDomain: "desafio-burpees-app.firebaseapp.com",
  projectId: "desafio-burpees-app",
  storageBucket: "desafio-burpees-app.firebasestorage.app",
  messagingSenderId: "604526585757",
  appId: "1:604526585757:web:90dfee327e9f6746e57174",
  measurementId: "G-401HJEKV91"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "desafio-burpees-app";

// --- Componente Calendario ---
const ChallengeCalendar = ({ daysPassed }) => {
    const days = Array.from({ length: 30 }, (_, i) => i);
    return (
        <div className="flex flex-nowrap items-center justify-between mt-2">
            {days.map(dayIndex => {
                let style = 'bg-gray-700'; // Futuro
                if (dayIndex < daysPassed) style = 'bg-gray-600'; // Pasado
                else if (dayIndex === daysPassed) style = 'bg-lime-400'; // Hoy
                return (
                    <div key={dayIndex} className={`flex-1 min-w-0 h-5 mx-px rounded-sm flex items-center justify-center ${style}`}>
                        <span className="font-mono text-black" style={{fontSize: '0.6rem', transform: 'scale(0.8)'}}>{dayIndex + 1}</span>
                    </div>
                );
            })}
        </div>
    );
};

// --- Componente Principal ---
export default function App() {
    // --- Estado de la App ---
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [challengeStartDate, setChallengeStartDate] = useState(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [isSessionHistoryExpanded, setIsSessionHistoryExpanded] = useState(false);

    // --- Estado de la Configuración del Desafío ---
    const [dailyGoal, setDailyGoal] = useState(336);
    const [workTime, setWorkTime] = useState(60);
    const [restTime, setRestTime] = useState(35);
    const [burpeesPerRound, setBurpeesPerRound] = useState(8);
    const [totalChallengeBurpees, setTotalChallengeBurpees] = useState(0);
    const CHALLENGE_GOAL = 10000;

    // --- Estado de la Sesión Diaria ---
    const [todaysBurpees, setTodaysBurpees] = useState(0);
    const [todaysParts, setTodaysParts] = useState([]);
    const [burpeeInput, setBurpeeInput] = useState('');
    const [nameInput, setNameInput] = useState('');

    // --- Estado de los Temporizadores ---
    const [emomTimerSeconds, setEmomTimerSeconds] = useState(workTime);
    const [timerPhase, setTimerPhase] = useState('Work');
    const [sessionTime, setSessionTime] = useState(0);
    const [timersActive, setTimersActive] = useState(false);
    const intervalRef = useRef(null);

    const getTodayDateString = () => new Date().toISOString().split('T')[0];

    // --- Efectos de Carga y Autenticación ---
    useEffect(() => {
        const authSubscription = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                signInAnonymously(auth).catch((e) => {
                    setError("Error de autenticación.");
                    setIsLoading(false);
                });
            }
        });
        return () => authSubscription();
    }, []);

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        };

        const challengeInfoRef = doc(db, `artifacts/${appId}/users/${userId}/challenge`, 'info');
        const unsubscribeChallenge = onSnapshot(challengeInfoRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setChallengeStartDate(data.startDate.toDate());
                setTotalChallengeBurpees(data.totalChallengeBurpees || 0);
            } else {
                 const newStartDate = new Date();
                 setDoc(challengeInfoRef, { startDate: newStartDate, totalChallengeBurpees: 0 });
            }
        }, (err) => {
            setError("Error al cargar datos del desafío.");
            setIsLoading(false);
        });

        const today = getTodayDateString();
        const sessionRef = doc(db, `artifacts/${appId}/users/${userId}/dailySessions`, today);
        const unsubscribeSession = onSnapshot(sessionRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setTodaysBurpees(data.totalBurpees || 0);
                setTodaysParts(data.parts || []);
            } else {
                setTodaysBurpees(0);
                setTodaysParts([]);
            }
            setIsLoading(false);
        }, (err) => {
            setError("Error al cargar datos de la sesión.");
            setIsLoading(false);
        });

        return () => {
            unsubscribeChallenge();
            unsubscribeSession();
        };
    }, [userId, resetTrigger]);
    
    // --- Efecto para Lógica de Temporizadores ---
    useEffect(() => {
        if (timersActive) {
            intervalRef.current = setInterval(() => {
                setSessionTime(prev => prev + 1);
                setEmomTimerSeconds(prev => {
                    if (prev - 1 < 0) return timerPhase === 'Work' ? (setTimerPhase('Rest'), restTime) : (setTimerPhase('Work'), workTime);
                    return prev - 1;
                });
            }, 1000);
        } else { clearInterval(intervalRef.current); }
        return () => clearInterval(intervalRef.current);
    }, [timersActive, timerPhase, workTime, restTime]);

    // --- Manejadores de Eventos ---
    const handleLogBurpees = async () => {
        const count = parseInt(burpeeInput, 10);
        if (!isNaN(count) && count > 0 && nameInput.trim() !== '' && userId) {
            const today = getTodayDateString();
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/dailySessions`, today);
            const challengeInfoRef = doc(db, `artifacts/${appId}/users/${userId}/challenge`, 'info');
            
            const newPart = { count, name: nameInput.trim(), time: new Date(), sessionTimeAtLog: sessionTime };
            const newTotal = todaysBurpees + count;
            const newParts = [...todaysParts, newPart];
            try {
                await setDoc(docRef, { totalBurpees: newTotal, parts: newParts, lastUpdated: serverTimestamp() }, { merge: true });
                await updateDoc(challengeInfoRef, { totalChallengeBurpees: increment(count) });
                setBurpeeInput('');
            } catch (e) { setError("No se pudo guardar tu progreso."); }
        }
    };

    const handleTimersToggle = () => setTimersActive(!timersActive);
    const handleTimersReset = () => {
        setTimersActive(false);
        setTimerPhase('Work');
        setEmomTimerSeconds(workTime);
        setSessionTime(0);
    };
    
    const handleSaveSettings = () => {
        setEmomTimerSeconds(workTime);
        setShowSettings(false);
        setConfirmReset(false);
    };

    const handleChallengeReset = async () => {
        if (!userId) return;
        
        setIsLoading(true);
        const today = getTodayDateString();
        const challengeInfoRef = doc(db, `artifacts/${appId}/users/${userId}/challenge`, 'info');
        const sessionRef = doc(db, `artifacts/${appId}/users/${userId}/dailySessions`, today);

        try {
            await deleteDoc(challengeInfoRef);
            await deleteDoc(sessionRef);
        } catch (error) {
            if (error.code !== 'not-found') {
                setError("Error al reiniciar el desafío.");
                setIsLoading(false);
                return;
            }
        }

        setChallengeStartDate(null);
        setTodaysBurpees(0);
        setTodaysParts([]);
        setTotalChallengeBurpees(0);
        handleTimersReset();
        
        setShowSettings(false);
        setConfirmReset(false);
        setResetTrigger(prev => prev + 1);
    };

    const formatTime = (totalSeconds, showHours = false) => {
        if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
        const hours = showHours ? Math.floor(totalSeconds / 3600) : 0;
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const parts = [];
        if (showHours) parts.push(hours.toString().padStart(2, '0'));
        parts.push(minutes.toString().padStart(2, '0'));
        parts.push(seconds.toString().padStart(2, '0'));
        return parts.join(':');
    };

    const daysPassed = challengeStartDate ? Math.max(0, Math.floor((new Date() - challengeStartDate) / (1000 * 60 * 60 * 24))) : -1;
    
    const estimatedTotalTime = useMemo(() => {
        if (burpeesPerRound <= 0 || dailyGoal <= 0) return 0;
        const rounds = Math.ceil(dailyGoal / burpeesPerRound);
        if (rounds <= 0) return 0;
        const totalSessionTime = (rounds * workTime) + ((rounds - 1) * restTime);
        return totalSessionTime > 0 ? totalSessionTime : 0;
    }, [dailyGoal, burpeesPerRound, workTime, restTime]);
    
    const dailyProgressPercentage = dailyGoal > 0 ? (todaysBurpees / dailyGoal) * 100 : 0;
    const challengeProgressPercentage = CHALLENGE_GOAL > 0 ? (totalChallengeBurpees / CHALLENGE_GOAL) * 100 : 0;

    // --- Renderizado ---
    if (isLoading) return <div className="flex items-center justify-center h-screen bg-black text-white"><p>Cargando...</p></div>;
    if (error) return <div className="flex items-center justify-center h-screen bg-black text-white"><p className="text-red-500">{error}</p></div>;

    if (showSettings) {
        return (
            <div className="min-h-screen bg-black text-white font-montserrat p-3 flex flex-col">
                 <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@700&family=Montserrat:wght@400;700&display=swap');
                    .font-dm-sans { font-family: 'DM Sans', sans-serif; }
                    .font-montserrat { font-family: 'Montserrat', sans-serif; }
                `}</style>
                <div className="w-full max-w-md mx-auto">
                    <h2 className="text-xl font-bold text-center mb-4 text-lime-400 font-dm-sans uppercase">Configuración</h2>
                    <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-4">
                        <div><label className="block text-sm font-medium text-gray-300 mb-1 font-dm-sans uppercase">Meta Diaria</label><input type="number" value={dailyGoal} onChange={e => setDailyGoal(parseInt(e.target.value) || 0)} className="w-full bg-gray-700 rounded-lg p-2 text-sm" /></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-1 font-dm-sans uppercase">Burpees por Ronda</label><input type="number" value={burpeesPerRound} onChange={e => setBurpeesPerRound(parseInt(e.target.value) || 1)} className="w-full bg-gray-700 rounded-lg p-2 text-sm" /></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-1 font-dm-sans uppercase">Tiempo de Trabajo (seg)</label><input type="number" value={workTime} onChange={e => setWorkTime(parseInt(e.target.value) || 0)} className="w-full bg-gray-700 rounded-lg p-2 text-sm" /></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-1 font-dm-sans uppercase">Tiempo de Descanso (seg)</label><input type="number" value={restTime} onChange={e => setRestTime(parseInt(e.target.value) || 0)} className="w-full bg-gray-700 rounded-lg p-2 text-sm" /></div>
                        <button onClick={handleSaveSettings} className="w-full bg-lime-400 text-black font-bold py-2 rounded-lg text-sm">Guardar y Volver</button>
                        <hr className="border-gray-600" />
                        <div className="text-center">
                            {confirmReset ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-red-400">¿Estás seguro? Se borrará todo el progreso.</p>
                                    <button onClick={handleChallengeReset} className="w-full bg-red-600 font-bold py-2 rounded-lg text-sm">Sí, Borrar Todo</button>
                                    <button onClick={() => setConfirmReset(false)} className="w-full bg-gray-600 font-bold py-2 rounded-lg text-sm">Cancelar</button>
                                </div>
                            ) : (
                                <button onClick={() => setConfirmReset(true)} className="w-full bg-red-800 hover:bg-red-700 font-bold py-2 rounded-lg text-sm">Borrar y Reiniciar Desafío</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-montserrat p-2 flex flex-col">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@700&family=Montserrat:wght@400;700&display=swap');
                .font-dm-sans { font-family: 'DM Sans', sans-serif; }
                .font-montserrat { font-family: 'Montserrat', sans-serif; }
            `}</style>
            <div className="w-full max-w-md mx-auto">
                <header className="relative text-center mb-2">
                    <h1 className="py-1 text-lg font-bold text-lime-400 uppercase tracking-widest font-dm-sans">10k Burpees Challenge</h1>
                    <button onClick={() => setShowSettings(true)} className="absolute top-0 right-0 h-full px-2 flex items-center text-orange-500 hover:text-orange-400"><SettingsIcon /></button>
                </header>

                <main className="flex-grow flex flex-col">
                    <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-lg mb-2"><h3 className="text-base font-semibold mb-1 text-center uppercase font-dm-sans">ATLETA</h3><input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Escribe tu nombre para la sesión" className="w-full bg-gray-700 text-white text-sm placeholder-gray-500 rounded-lg px-2 py-2 border-transparent focus:outline-none focus:ring-2 focus:ring-lime-500 text-center" /></div>
                    <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-lg mb-2">
                        <h2 className="text-base font-semibold text-white mb-1 font-dm-sans uppercase">Progreso del Día</h2>
                        <div className="flex justify-between items-end mb-1"><span className="text-lime-400 font-bold text-lg">{todaysBurpees.toLocaleString()} / {dailyGoal.toLocaleString()}</span><span className="font-bold text-sm text-gray-400">Restan: {(dailyGoal - todaysBurpees).toLocaleString()}</span></div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-lime-400 h-2.5 rounded-full" style={{ width: `${Math.min(dailyProgressPercentage, 100)}%` }}></div></div>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-lg mb-2">
                        <div className="flex justify-between items-center text-sm"><h2 className="font-semibold text-white font-dm-sans uppercase">Progreso del Desafío</h2><span className="font-mono text-lime-400">{challengeProgressPercentage.toFixed(2)}%</span></div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1"><div className="bg-gray-600 h-2.5 rounded-full" style={{ width: `${challengeProgressPercentage}%` }}></div></div>
                        <ChallengeCalendar daysPassed={daysPassed} />
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-lg mb-2 text-center">
                       <h3 className="text-sm font-bold text-lime-400 font-dm-sans uppercase">Guía de Ritmo</h3>
                       <p className="text-xs text-gray-300">{workTime}s trabajo ({burpeesPerRound} burpees) + {restTime}s descanso</p>
                       <p className="text-xs text-gray-400 mt-1">Tiempo total estimado: <span className="font-bold text-white">{formatTime(estimatedTotalTime, true)}</span></p>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-lg mb-2"><div className="grid grid-cols-2 gap-2 text-center"><div className={`py-1 rounded-lg ${timerPhase === 'Work' ? 'bg-gray-700/50' : 'bg-gray-700/50'}`}><p className={`text-xs font-bold ${timerPhase === 'Work' ? 'text-lime-400' : 'text-gray-300'}`}>{timerPhase === 'Work' ? 'TRABAJO' : 'DESCANSO'}</p><p className="text-3xl font-mono font-bold tracking-tight">{formatTime(emomTimerSeconds)}</p></div><div className="py-1 rounded-lg bg-gray-700/50"><p className="text-xs font-bold text-gray-300">TIEMPO TOTAL</p><p className="text-3xl font-mono font-bold tracking-tight">{formatTime(sessionTime, true)}</p></div></div><div className="flex justify-center gap-2 mt-2"><button onClick={handleTimersToggle} className={`flex items-center justify-center w-full text-black font-bold py-2 px-3 text-sm rounded-lg shadow-md ${timersActive ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-lime-400 hover:bg-lime-500'}`}>{timersActive ? <PauseIcon/> : <PlayIcon/>}{timersActive ? 'Pausa' : 'Inicio'}</button><button onClick={handleTimersReset} className="flex items-center justify-center w-full bg-gray-600 text-white font-bold py-2 px-3 text-sm rounded-lg hover:bg-gray-700 shadow-md"><ResetIcon/>Reiniciar</button></div></div>
                    <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-lg mb-2"><h3 className="text-base font-semibold mb-2 text-center font-dm-sans uppercase">Registrar Burpees</h3><div className="flex gap-2"><input type="number" value={burpeeInput} onChange={(e) => setBurpeeInput(e.target.value)} placeholder="Burpees" className="w-2/3 bg-gray-700 text-white text-sm placeholder-gray-500 rounded-lg px-2 py-2 border-transparent focus:outline-none focus:ring-2 focus:ring-lime-500" /><button onClick={handleLogBurpees} disabled={!burpeeInput || parseInt(burpeeInput) <= 0 || !nameInput.trim()} className="w-1/3 bg-lime-500 text-black font-bold py-2 px-2 rounded-lg hover:bg-lime-600 text-sm disabled:bg-gray-600 shadow-md">Registrar</button></div></div>
                    
                    {todaysParts.length > 0 && (
                        <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-lg">
                            <h3 className="text-base font-semibold mb-2 text-center font-dm-sans uppercase">Sesión del Día</h3>
                            <div className="text-xs space-y-1">
                                {[...todaysParts].slice(isSessionHistoryExpanded ? 0 : -3).reverse().map((part, index) => (
                                    <div key={index} className="flex justify-between items-center bg-gray-700 p-1 rounded">
                                        <span>{part.name}</span>
                                        <span className="font-mono text-lime-400">{part.count} reps</span>
                                        <span className="font-mono text-gray-400">{formatTime(part.sessionTimeAtLog, true)}</span>
                                    </div>
                                ))}
                            </div>
                             {todaysParts.length > 3 && (
                                <button onClick={() => setIsSessionHistoryExpanded(!isSessionHistoryExpanded)} className="text-xs text-center w-full mt-2 text-gray-400 hover:text-white flex items-center justify-center">
                                    {isSessionHistoryExpanded ? 'Mostrar menos' : 'Mostrar más'}
                                    {isSessionHistoryExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                </button>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

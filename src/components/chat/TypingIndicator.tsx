import React from 'react';
import { motion } from 'framer-motion';

const ThinkingMessages = [
    'Reading the contract…',
    'Analyzing clauses…',
    'Checking relevant sections…',
    'Synthesizing data…',
    'Consulting Document Specialist…',
    'Consulting Conditions Specialist…'
];

const TypingIndicator: React.FC = () => {
    const [index, setIndex] = React.useState(0);

    React.useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % ThinkingMessages.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex gap-1.5 px-2">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.3, 1, 0.3]
                        }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeInOut"
                        }}
                        className="w-1.5 h-1.5 rounded-full bg-aaa-blue"
                    />
                ))}
            </div>
            <motion.p
                key={index}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 px-2"
            >
                {ThinkingMessages[index]}
            </motion.p>
        </div>
    );
};

export default React.memo(TypingIndicator);

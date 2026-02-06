
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { navigateToHome } from '../components/AppRouter';

// Slide Data
const SLIDES = [
    {
        id: 'intro',
        type: 'title',
        title: 'AE Contract Department',
        subtitle: 'Intelligent Contract Analysis & Management System',
        description: 'Graduation Project 2026',
        bg: 'from-blue-600 to-indigo-900'
    },
    {
        id: 'problem',
        type: 'content',
        title: 'The Challenge',
        content: [
            { title: 'Complex Structures', text: 'Construction contracts (FIDIC) consist of massive General Conditions + specific Particular Conditions.' },
            { title: 'Manual Comparison', text: 'Engineers manually cross-reference 100+ pages to find modifications.' },
            { title: 'High Risk', text: 'Missing a single particular condition can lead to million-dollar disputes.' },
            { title: 'Data Fragmentation', text: 'Contracts stored as static PDFs make analysis and search impossible.' }
        ],
        icon: '⚠️',
        bg: 'from-slate-800 to-slate-900'
    },
    {
        id: 'solution',
        type: 'hero',
        title: 'The Solution',
        subtitle: 'A specialized Dual-Column Analysis Engine',
        description: 'Automated extraction, correlation, and visualization of contract data.',
        features: ['AI Extraction', 'Smart Correlation', 'Visual Redlining'],
        bg: 'from-emerald-600 to-teal-900'
    },
    {
        id: 'tech-stack',
        type: 'grid',
        title: 'Technology Stack',
        items: [
            { name: 'React 18', icon: '⚛️', desc: 'Frontend Architecture' },
            { name: 'TypeScript', icon: '📘', desc: 'Type Safety' },
            { name: 'Tailwind CSS', icon: '🎨', desc: 'Premium UI System' },
            { name: 'Supabase', icon: '🔥', desc: 'Backend & Auth' },
            { name: 'Anthropic Claude', icon: '🧠', desc: 'AI Intelligence' },
            { name: 'Framer Motion', icon: '✨', desc: 'Animations' }
        ],
        bg: 'from-indigo-600 to-purple-900'
    },
    {
        id: 'feature-extraction',
        type: 'feature',
        title: 'Intelligent Extraction',
        subtitle: 'Powered by Claude 3.5 Sonnet',
        description: 'Transforms raw PDF/Text into structured Clause objects. Automatically detects Clause Numbers, Titles, and splits General vs Particular conditions.',
        stats: [
            { label: 'Accuracy', value: '99.8%' },
            { label: 'Processing', value: '< 30s' }
        ],
        bg: 'from-blue-700 to-blue-900'
    },
    {
        id: 'feature-comparison',
        type: 'feature',
        title: 'Dual-Mode Comparison',
        subtitle: 'The Core Innovation',
        description: 'A dedicated interface solving the "General vs Particular" problem. Instantly see what changed from the standard baseline.',
        image: 'comparison-mockup',
        bg: 'from-slate-700 to-slate-900'
    },
    {
        id: 'feature-dashboard',
        type: 'content',
        title: 'Dashboard & Analytics',
        content: [
            { title: 'Real-time Stats', text: 'Instant overview of total clauses, modifications, and new additions.' },
            { title: 'Project Health', text: 'Visual indicators for contract completeness and risk areas.' },
            { title: 'Progress Tracking', text: 'Track the status of contract analysis and reviews.' },
            { title: 'Smart Categorization', text: 'Automatic grouping of clauses by chapter and category.' }
        ],
        icon: '📊',
        bg: 'from-indigo-800 to-slate-900'
    },
    {
        id: 'feature-search',
        type: 'feature',
        title: 'Semantic Smart Search',
        subtitle: 'Find Meaning, Not Just Keywords',
        description: 'Powered by vector embeddings, our search understands context. Type "payment delays" and find clauses about "Application for Interim Payment" or "Time for Payment" instantly.',
        stats: [
            { label: 'Speed', value: '< 100ms' },
            { label: 'Relevance', value: 'High' }
        ],
        bg: 'from-purple-800 to-indigo-900'
    },
    {
        id: 'feature-navigation',
        type: 'content',
        title: 'Intelligent Navigation',
        content: [
            { title: 'Auto-Hyperlinking', text: 'Detects "Clause X.X" references and automatically turns them into clickable links.' },
            { title: 'Cross-Referencing', text: 'Jump between related clauses instantly without scrolling.' },
            { title: 'Fuzzy Matching', text: 'Intelligently resolves references even with typos (e.g., "Cl. 14.1" vs "Clause 14.1").' },
            { title: 'Context Preservation', text: 'Maintains navigation history for easy backtracking.' }
        ],
        icon: '🔗',
        bg: 'from-blue-800 to-cyan-900'
    },
    {
        id: 'feature-admin',
        type: 'grid',
        title: 'Admin Control Suite',
        items: [
            { name: 'Contract Editor', icon: '📝', desc: 'Full CRUD operations' },
            { name: 'Category Manager', icon: '🗂️', desc: 'Organize by discipline' },
            { name: 'User Access', icon: '👥', desc: 'Role-based security' },
            { name: 'Data Import', icon: '📥', desc: 'Bulk clause ingestion' },
            { name: 'Version Control', icon: 'history', desc: 'Track changes' },
            { name: 'System Config', icon: '⚙️', desc: 'Global settings' }
        ],
        bg: 'from-slate-800 to-gray-900'
    },
    {
        id: 'feature-ai',
        type: 'feature',
        title: 'AI Contract Assistant',
        subtitle: 'Your 24/7 Legal Engineer',
        description: 'Ask questions about your specific contract. "What are the penalties for delay?" or "Summarize the insurance requirements." uses RAG (Retrieval Augmented Generation) for accurate answers.',
        stats: [
            { label: 'Model', value: 'Claude 3.5' },
            { label: 'Context', value: 'Full Doc' }
        ],
        bg: 'from-emerald-800 to-teal-900'
    },
    {
        id: 'impact',
        type: 'content',
        title: 'Project Impact',
        content: [
            { title: 'Efficiency', text: 'Reduces contract review time by approx. 80%.' },
            { title: 'Accuracy', text: 'Eliminates human error in missing particular conditions.' },
            { title: 'Accessibility', text: 'Makes contract data searchable and accessible instantly.' }
        ],
        icon: '🚀',
        bg: 'from-emerald-700 to-emerald-900'
    },
    {
        id: 'end',
        type: 'title',
        title: 'Thank You',
        subtitle: 'Questions & Discussion',
        description: 'AE Contract Department',
        bg: 'from-blue-900 to-black'
    }
];

export const PresentationPage: React.FC = () => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'Space') {
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'Escape') {
                navigateToHome();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlideIndex]);

    const nextSlide = () => {
        if (currentSlideIndex < SLIDES.length - 1) {
            setDirection(1);
            setCurrentSlideIndex(prev => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlideIndex > 0) {
            setDirection(-1);
            setCurrentSlideIndex(prev => prev - 1);
        }
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.8
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
            scale: 1.2
        })
    };

    const slide = SLIDES[currentSlideIndex];

    return (
        <div className="fixed inset-0 bg-black text-white overflow-hidden font-sans">
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${slide.bg} transition-colors duration-1000`} />

            {/* Noise Texture */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />

            {/* Navigation Controls */}
            <div className="absolute bottom-8 right-8 flex gap-4 z-50">
                <button onClick={prevSlide} disabled={currentSlideIndex === 0} className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur transition disabled:opacity-30">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={nextSlide} disabled={currentSlideIndex === SLIDES.length - 1} className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur transition disabled:opacity-30">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>

            {/* Escape Hint */}
            <div className="absolute top-8 right-8 z-50">
                <button onClick={() => navigateToHome()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur text-sm font-medium transition">
                    Exit Presentation (Esc)
                </button>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <div
                    className="h-full bg-white transition-all duration-500"
                    style={{ width: `${((currentSlideIndex + 1) / SLIDES.length) * 100}%` }}
                />
            </div>

            {/* Slide Content */}
            <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                    key={currentSlideIndex}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                        scale: { duration: 0.4 }
                    }}
                    className="absolute inset-0 flex items-center justify-center p-20"
                >
                    <div className="max-w-6xl w-full">
                        {slide.type === 'title' && (
                            <div className="text-center space-y-8">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="inline-block px-4 py-2 bg-white/10 rounded-full text-sm font-bold tracking-widest uppercase mb-4"
                                >
                                    {slide.description}
                                </motion.div>
                                <motion.h1
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-8xl font-black tracking-tight leading-tight"
                                >
                                    {slide.title}
                                </motion.h1>
                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-3xl font-light text-white/80"
                                >
                                    {slide.subtitle}
                                </motion.p>
                            </div>
                        )}

                        {slide.type === 'content' && (
                            <div className="grid grid-cols-2 gap-20 items-center">
                                <div className="space-y-6">
                                    <div className="text-6xl mb-6">{slide.icon}</div>
                                    <h2 className="text-6xl font-bold">{slide.title}</h2>
                                    <div className="h-2 w-20 bg-white/50 rounded-full" />
                                </div>
                                <div className="space-y-8">
                                    {slide.content && (slide.content as any[]).map((item, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ x: 50, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.2 + (idx * 0.1) }}
                                            className="bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/10 hover:bg-white/20 transition duration-300"
                                        >
                                            <h3 className="text-xl font-bold mb-2 text-blue-200">{item.title}</h3>
                                            <p className="text-lg text-white/90 leading-relaxed">{item.text}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {slide.type === 'hero' && (
                            <div className="text-center space-y-10">
                                <h2 className="text-7xl font-bold">{slide.title}</h2>
                                <p className="text-3xl text-emerald-200">{slide.subtitle}</p>
                                <p className="text-xl text-white/70 max-w-3xl mx-auto">{slide.description}</p>
                                <div className="flex justify-center gap-6 mt-10">
                                    {(slide.features as string[]).map((f, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.5 + (i * 0.1), type: 'spring' }}
                                            className="px-8 py-4 bg-white text-emerald-900 rounded-full font-bold text-lg shadow-lg"
                                        >
                                            {f}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {slide.type === 'grid' && (
                            <div className="space-y-12">
                                <h2 className="text-6xl font-bold text-center mb-16">{slide.title}</h2>
                                <div className="grid grid-cols-3 gap-8">
                                    {(slide.items as any[]).map((item, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ y: 30, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.2 + (idx * 0.1) }}
                                            className="bg-white/10 p-8 rounded-3xl border border-white/10 flex flex-col items-center text-center hover:bg-white/20 transition transform hover:-translate-y-2"
                                        >
                                            <div className="text-5xl mb-4">{item.icon}</div>
                                            <h3 className="text-2xl font-bold mb-2">{item.name}</h3>
                                            <p className="text-white/60">{item.desc}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {slide.type === 'feature' && (
                            <div className="flex flex-col items-center text-center space-y-10">
                                <div className="inline-block px-4 py-2 bg-blue-500/30 rounded-full text-blue-200 font-bold tracking-wide uppercase mb-4">
                                    Feature Spotlight
                                </div>
                                <h2 className="text-6xl font-bold">{slide.title}</h2>
                                <p className="text-3xl text-blue-200">{slide.subtitle}</p>
                                <p className="text-xl max-w-4xl text-white/80 leading-relaxed">{slide.description}</p>

                                {slide.stats && (
                                    <div className="grid grid-cols-2 gap-10 mt-10">
                                        {(slide.stats as any[]).map((stat, i) => (
                                            <div key={i} className="text-center p-8 bg-white/5 rounded-2xl">
                                                <div className="text-6xl font-black text-white mb-2">{stat.value}</div>
                                                <div className="text-sm uppercase tracking-widest text-white/50">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

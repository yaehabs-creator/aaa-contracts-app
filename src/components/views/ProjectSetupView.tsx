import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { createRootContract } from '@/services/contractIngestionService';
import { AnalysisStatus } from '@/types';
import toast from 'react-hot-toast';

export const ProjectSetupView: React.FC = () => {
    const { setStatus, setContract } = useAppStore();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        projectName: '',
        projectId: '',
        category: 'FIDIC'
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.projectName || !formData.projectId) {
            toast.error("Please fill all required fields");
            return;
        }

        setIsLoading(true);
        try {
            const contract = await createRootContract(
                formData.projectName, 
                formData.projectId, 
                formData.category
            );
            setContract(contract);
            setStatus(AnalysisStatus.INGESTION);
            toast.success("Project baseline created successfully!");
        } catch (err: any) {
            toast.error(err.message || "Failed to create project");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-12 bg-white rounded-[48px] border border-aaa-border shadow-premium space-y-12 animate-in slide-in-from-bottom-12 duration-700">
            <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-aaa-blue rounded-3xl mx-auto flex items-center justify-center text-white text-3xl shadow-xl shadow-aaa-blue/20">
                    🏗️
                </div>
                <h2 className="text-4xl font-black text-aaa-blue tracking-tighter">
                    Initialize Project Baseline
                </h2>
                <p className="text-aaa-muted font-bold text-sm uppercase tracking-widest">
                    Step 1: Define Metadata Environment
                </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em] ml-2">Project Name</label>
                        <input 
                            required
                            type="text" 
                            placeholder="e.g. Al Habtoor Palace Refurbishment"
                            className="w-full px-8 py-5 bg-aaa-bg/30 rounded-3xl border border-aaa-border focus:border-aaa-blue outline-none text-aaa-text font-black text-sm transition-all focus:bg-white focus:shadow-xl"
                            value={formData.projectName}
                            onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em] ml-2">Internal Project ID</label>
                        <input 
                            required
                            type="text" 
                            placeholder="e.g. PRJ-2024-001"
                            className="w-full px-8 py-5 bg-aaa-bg/30 rounded-3xl border border-aaa-border focus:border-aaa-blue outline-none text-aaa-text font-black text-sm transition-all focus:bg-white focus:shadow-xl"
                            value={formData.projectId}
                            onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em] ml-2">Contract Category</label>
                    <select 
                        className="w-full px-8 py-5 bg-aaa-bg/30 rounded-3xl border border-aaa-border focus:border-aaa-blue outline-none text-aaa-text font-black text-sm transition-all focus:bg-white focus:shadow-xl appearance-none cursor-pointer"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                        <option value="FIDIC">Fidict Red Book 1999/2017</option>
                        <option value="NEC">NEC4 Engineering & Construction</option>
                        <option value="AIA">AIA Standard Contracts</option>
                        <option value="CUSTOM">Custom Enterprise Draft</option>
                    </select>
                </div>

                <div className="pt-8 flex justify-center">
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="px-20 py-6 bg-aaa-blue text-white rounded-[24px] font-black shadow-2xl hover:bg-aaa-navy transition-all active:scale-95 text-xs uppercase tracking-[0.3em] flex items-center gap-4"
                    >
                        {isLoading ? 'Processing Neural Root...' : 'Initialize Ingestion Pipeline'}
                        {!isLoading && <span className="text-xl">→</span>}
                    </button>
                </div>
            </form>

            <div className="pt-8 border-t border-aaa-border/50 text-center">
                <p className="text-[10px] text-aaa-muted font-black uppercase tracking-widest leading-relaxed">
                    By initializing, a root UUID will be generated and unique SHA-256 fingerprints <br /> will be enforced for all subsequent section uploads.
                </p>
            </div>
        </div>
    );
};

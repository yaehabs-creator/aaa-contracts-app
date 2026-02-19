# GraphRAG Workbench


A modern, interactive web application for building and visualizing knowledge graphs using Microsoft's [GraphRAG](https://github.com/microsoft/graphrag) framework. Transform your documents into an explorable 3D knowledge graph with advanced AI-powered analysis and querying capabilities.

![GraphRAG Workbench](https://img.shields.io/badge/GraphRAG-Workbench-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black)
![React](https://img.shields.io/badge/React-19.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)


https://github.com/user-attachments/assets/1f588a45-07ca-4953-92ed-fc888fe28cff


## ✨ Features

### 📊 Interactive 3D Visualization
- **Immersive 3D Knowledge Graph**: Navigate through your data in a stunning 3D space with smooth animations
- **Community Detection**: Visualize hierarchical community structures with color-coded boundaries
- **Smart Node Sizing**: Entity importance reflected through dynamic node sizing based on centrality metrics
- **Advanced Filtering**: Filter by entity types, community levels, and relationship weights
- **Search & Highlight**: Real-time search with visual highlighting of matching entities

### 🗂️ Document Management
- **PDF Processing**: Drag-and-drop PDF upload with automatic text extraction
- **Batch Operations**: Process multiple documents simultaneously
- **Archive Management**: Save and restore different knowledge graph versions
- **Progress Tracking**: Real-time indexing progress with detailed logs

### 🤖 AI-Powered Analysis  
- **GraphRAG Integration**: Leverage Microsoft's GraphRAG for entity extraction and relationship mapping
- **Community Reports**: AI-generated summaries of detected communities
- **Chat Interface**: Query your knowledge graph using natural language
- **Multiple Search Modes**: Local, global, drift, and basic search strategies

### 🎯 Advanced Features
- **Community Isolator**: Focus on specific community hierarchies for detailed analysis
- **Relationship Weighting**: Visualize connection strength with dynamic link thickness
- **Bloom Effects**: Beautiful post-processing effects for enhanced visualization
- **Responsive Design**: Optimized for desktop and tablet usage

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- OpenAI API key
- Python 3.10+ (for GraphRAG backend)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ChristopherLyon/graphrag-workbench.git
   cd graphrag-workbench
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Configure GraphRAG**
   
   The `settings.yaml` file is pre-configured for OpenAI. Adjust if needed:
   - Model settings (defaults to `gpt-4o-mini`)
   - Embedding model (defaults to `text-embedding-3-small`)
   - Processing parameters

5. **Install GraphRAG Python package**
   ```bash
   pip install graphrag
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Building Your First Knowledge Graph

1. **Upload Documents**
   - Click "Add PDFs" or drag and drop PDF files onto the Dataset card
   - Supported formats: PDF files only

2. **Run Indexing**
   - Click the "Run Index" button to start the GraphRAG processing
   - Monitor progress in real-time with detailed logs
   - The process extracts entities, relationships, and communities from your documents

3. **Explore the Graph**
   - Once indexing completes, your 3D knowledge graph will appear
   - Use mouse controls to navigate: drag to rotate, scroll to zoom, right-click to pan
   - Click on nodes to inspect entities and their connections

### Advanced Usage

#### Community Analysis
- Enable "Community Isolator" to focus on specific community hierarchies
- Communities are organized in levels: Sector → System → Subsystem → Component → Element

#### Search and Discovery
- Use the search box (Cmd/Ctrl + K) to find specific entities
- Matching entities will be highlighted in the visualization
- Use the Inspector panel to view detailed entity information

#### Chat Interface
- Switch to the Chat tab to query your knowledge graph using natural language
- Ask questions like "What are the main themes?" or "How are these entities connected?"

#### Archive Management
- Create archives of your current knowledge graph state
- Restore previous versions to compare different document sets
- Rename archives for better organization

## 🏗️ Architecture

### Frontend Stack
- **Next.js 15.5**: React framework with App Router
- **React Three Fiber**: 3D graphics rendering
- **TailwindCSS**: Modern styling framework
- **shadcn/ui**: High-quality UI components
- **Three.js**: WebGL-based 3D graphics library

### Key Components
- **GraphVisualizer**: Main 3D visualization component with WebGL rendering
- **CorpusPanel**: Document management and indexing interface  
- **ChatPanel**: AI-powered natural language querying
- **Inspector**: Detailed entity and relationship analysis

### Backend Integration
- **Next.js API Routes**: RESTful endpoints for data management
- **GraphRAG Pipeline**: Microsoft's GraphRAG for knowledge extraction
- **File System Storage**: Local storage for documents and processed data
- **Streaming APIs**: Real-time progress updates during indexing

### Data Flow
1. **Document Upload** → PDF processing and text extraction
2. **GraphRAG Processing** → Entity extraction, relationship mapping, community detection
3. **Data Transformation** → JSON format optimization for web rendering
4. **3D Visualization** → Force-directed layout with community clustering
5. **Interactive Querying** → AI-powered search and analysis

## ⚙️ Configuration

### GraphRAG Settings (`settings.yaml`)
The configuration file controls the GraphRAG processing pipeline:

```yaml
models:
  default_chat_model:
    type: openai_chat
    model: gpt-4o-mini-2024-07-18
    api_key: ${OPENAI_API_KEY}
  
  default_embedding_model:
    type: openai_embedding  
    model: text-embedding-3-small
    api_key: ${OPENAI_API_KEY}

extract_graph:
  entity_types: [organization, person, geo, event]
  max_gleanings: 1

community_reports:
  max_length: 2000
  max_input_length: 8000
```

### Customization Options
- **Entity Types**: Modify the types of entities to extract
- **Model Selection**: Choose different OpenAI models for processing
- **Chunking Parameters**: Adjust text processing chunk sizes
- **Community Detection**: Configure clustering algorithms

## 📁 Project Structure

```
graphrag-workbench/
├── app/                    # Next.js App Router
│   ├── api/               # API routes for data management
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── GraphVisualizer.tsx # 3D visualization engine
│   ├── CorpusPanel.tsx   # Document management
│   ├── ChatPanel.tsx     # AI chat interface  
│   └── Inspector.tsx     # Entity detail viewer
├── lib/                  # Utility libraries
│   ├── graphData.ts      # Data models and loaders
│   ├── forceSimulation.ts # 3D layout algorithms
│   └── utils.ts          # Helper functions
├── settings.yaml         # GraphRAG configuration
└── prompts/              # AI prompt templates
```

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```

### Building for Production
```bash
npm run build
npm run start
```

### Code Quality
```bash
npm run lint        # ESLint checking
npm run typecheck   # TypeScript validation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Requirements

### System Requirements
- **Node.js**: 18.0.0 or higher
- **Python**: 3.10 or higher (for GraphRAG backend)
- **Memory**: 8GB RAM minimum (16GB recommended for large documents)
- **Storage**: SSD recommended for better I/O performance

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebGL 2.0 support required for 3D visualization.

## 🐛 Troubleshooting

### Common Issues

**Graph not loading after indexing**
- Check that all required JSON files are generated in the `output/` directory
- Verify the API endpoints are accessible at `/api/data/`

**Slow 3D performance**  
- Reduce the number of visible communities in complex graphs
- Try disabling bloom effects in crowded visualizations
- Consider filtering to smaller entity subsets

**Indexing fails**
- Verify your OpenAI API key is correctly set in `.env`
- Check that GraphRAG Python package is installed
- Review the indexing logs for specific error messages

**Memory issues with large documents**
- Process documents in smaller batches
- Increase Node.js memory limit: `export NODE_OPTIONS="--max-old-space-size=8192"`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Microsoft GraphRAG](https://github.com/microsoft/graphrag) - Core knowledge graph extraction
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber) - 3D rendering capabilities
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Lucide Icons](https://lucide.dev/) - Clean, consistent iconography

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/ChristopherLyon/graphrag-workbench/issues) page
2. Review the troubleshooting section above
3. Create a new issue with detailed information about your problem

---

**Happy Knowledge Graphing! 🎉**

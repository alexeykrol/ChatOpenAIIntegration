# MaaS - Memory as a Service

**AI Memory Microservice for LLM Applications**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](CHANGELOG.md)
[![Status](https://img.shields.io/badge/status-prototype-orange.svg)](docs/MaaS_IMPLEMENTATION_PLAN.md)

---

## 🎯 What is MaaS?

MaaS (Memory as a Service) is an independent microservice that provides intelligent memory management for AI assistants and LLM-based applications. It acts as an external "memory layer" that:

- **Stores and retrieves** project context, facts, and decisions
- **Compresses history** without losing important information
- **Tracks knowledge attribution** to maintain transparency
- **Builds dynamic context** optimized for token budgets
- **Works with any LLM** (OpenAI, Claude, open-source models)

## 🏗️ Architecture

```
Your App → HTTP/Webhook → MaaS Pipeline → Supabase DB
                              ↓
                        Context Bundle
                              ↓
                          Your LLM
```

MaaS is **platform-agnostic** and can be integrated with:
- Chat applications
- AI agents
- Custom GPTs
- Slack/Discord bots
- CLI tools
- Any system that needs AI memory

## 🚀 Quick Start

### Prerequisites
- [n8n](https://n8n.io/) (self-hosted or cloud)
- [Supabase](https://supabase.com/) account
- OpenAI API key (or other LLM provider)

### Installation

1. **Setup Environment**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env with your credentials
   nano .env
   ```

2. **Setup Database**
   ```bash
   # Install dependencies
   cd scripts && npm install

   # Create database structure
   node create_maas_tables.mjs
   ```

3. **Import n8n Workflow**
   - Open n8n
   - Import `n8n/maas_workflow.json`
   - Configure credentials using environment variables

4. **Test the Service**
   ```bash
   curl -X POST $N8N_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{
       "user_query": "What did we decide about the architecture?",
       "session_id": "test-session",
       "user_id": "test-user"
     }'
   ```

## 📡 API Reference

### Core Endpoint

**POST** `/webhook/maas`

#### Request
```json
{
  "user_query": "string",      // User's question/request
  "session_id": "string",      // Chat/session identifier
  "user_id": "string",         // User identifier
  "project_id": "string?",     // Optional project ID
  "max_tokens": "number?"      // Optional token budget
}
```

#### Response
```json
{
  "context_bundle": {
    "mission": "string",
    "facts": [],
    "decisions": [],
    "recent_context": "string",
    "instructions": []
  },
  "metadata": {
    "tokens_used": "number",
    "facts_included": "number",
    "compression_ratio": "number"
  }
}
```

## 🗂️ Project Structure

```
MaaS/
├── docs/                    # Documentation
│   ├── MaaS.md             # Full specification
│   ├── MaaS_IMPLEMENTATION_PLAN.md
│   ├── CONTEXT_OPTIMIZATION.md
│   └── API.md
├── schemas/                # Database schemas
│   ├── 001_initial_schema.sql
│   ├── 002_add_facts.sql
│   └── ...
├── n8n/                    # n8n workflows
│   ├── maas_workflow.json
│   ├── prompts/
│   └── functions/
├── examples/               # Integration examples
│   ├── nodejs/
│   ├── python/
│   └── curl/
└── tests/                  # Test suites
    ├── api/
    └── integration/
```

## 🔧 Core Concepts

### Entities
- **Project** - Mission, goals, constraints
- **Fact** - Verifiable information with attribution
- **Decision** - Recorded choices and agreements
- **Link** - Relationships between entities
- **Snapshot** - Point-in-time context bundle

### Pipeline Stages
1. **NormalizeRequest** - Understand intent and context
2. **UpdateHistory** - Extract facts and decisions
3. **BuildSnapshot** - Assemble relevant context
4. **RetrieveKnowledge** - Add external knowledge (RAG)
5. **ComposeContext** - Create optimized prompt
6. **WriteBack** - Store new facts and decisions

## 📊 Features

### Current (v0.1)
- ✅ Basic context management
- ✅ Simple summarization
- ✅ Project-based organization

### Roadmap
- 🚧 Fact extraction and storage
- 🚧 Decision tracking
- 🚧 Smart compression algorithms
- 🚧 Attribution and sourcing
- 🚧 Conflict detection
- 🚧 RAG integration
- 🚧 Caching layer
- 🚧 Metrics and observability

## 🤝 Integration Examples

### Node.js
```javascript
const response = await fetch('https://your-maas/webhook/maas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_query: query,
    session_id: chatId,
    user_id: userId
  })
});

const { context_bundle } = await response.json();
// Use context_bundle with your LLM
```

### Python
```python
import requests

response = requests.post(
    'https://your-maas/webhook/maas',
    json={
        'user_query': query,
        'session_id': chat_id,
        'user_id': user_id
    }
)

context_bundle = response.json()['context_bundle']
# Use context_bundle with your LLM
```

## 🧪 Testing

```bash
# Run API tests
npm test

# Run integration tests
npm run test:integration

# Test with example data
npm run test:examples
```

## 📈 Metrics

MaaS tracks:
- **Compression ratio** - How much context is compressed
- **Attribution rate** - Percentage of facts with sources
- **Token efficiency** - Tokens saved vs. naive approach
- **Latency** - Pipeline processing time
- **Cache hit rate** - Efficiency of caching

## 🛡️ Security & Privacy

- **Data isolation** - Projects are isolated by user
- **No training** - Your data is never used for training
- **Configurable retention** - Control how long data is kept
- **Audit trail** - All operations are logged

## 📝 License

MIT License - see [LICENSE](LICENSE) file

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📚 Documentation

- [Full Specification](docs/MaaS.md)
- [Implementation Plan](docs/MaaS_IMPLEMENTATION_PLAN.md)
- [Context Optimization Patterns](docs/CONTEXT_OPTIMIZATION.md)
- [API Documentation](docs/API.md)

## 🙏 Acknowledgments

This project is inspired by:
- Modern LLM architectures (Claude, ChatGPT)
- RAG systems and vector databases
- Event sourcing patterns
- Microservice architectures

## 📬 Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/MaaS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/MaaS/discussions)

---

**Built with ❤️ for the AI community**

*Making AI assistants remember what matters*
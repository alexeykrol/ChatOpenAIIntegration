# ROADMAP — ChatOpenAII

*Стратегическое видение развития проекта*

## Текущая версия: 0.1.0-mvp

MVP с полным функционалом чата, требует hardening.

---

## v0.2.0 — Production Ready

**Цель:** Безопасный деплой для реальных пользователей

### Security

- [ ] Backend proxy для OpenAI API (Supabase Edge Function)
- [ ] AES-256-GCM шифрование API ключей
- [ ] Rate limiting
- [ ] CORS настройка для production домена

### Quality

- [ ] Unit тесты (Vitest) — покрытие 80%+
- [ ] E2E тесты (Playwright) — critical paths
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Error monitoring (Sentry)

### DevOps

- [ ] Production deploy на Vercel
- [ ] Custom domain
- [ ] SSL certificates
- [ ] Environment management (dev/staging/prod)

---

## v0.3.0 — Enhanced UX

**Цель:** Улучшенный пользовательский опыт

### Mobile

- [ ] Полностью responsive design
- [ ] Touch-friendly interactions
- [ ] PWA support (offline mode)

### Features

- [ ] Поиск по сообщениям
- [ ] Папки для чатов
- [ ] Избранные сообщения
- [ ] Keyboard shortcuts modal

### Performance

- [ ] Code splitting
- [ ] Lazy loading компонентов
- [ ] Оптимизация bundle size

---

## v0.4.0 — Multimodal

**Цель:** Расширение возможностей AI

### Voice

- [ ] Голосовой ввод (Web Speech API)
- [ ] Text-to-speech для ответов
- [ ] Voice commands

### Images

- [ ] DALL-E integration для генерации изображений
- [ ] Image attachments в чат
- [ ] Vision API для анализа изображений

### Files

- [ ] File uploads
- [ ] PDF/Document analysis
- [ ] Code file attachments с syntax highlighting

---

## v1.0.0 — Full Release

**Цель:** Полноценный продукт

### Collaboration

- [ ] Shared chats (публичные ссылки)
- [ ] Team workspaces
- [ ] Chat templates

### Export/Import

- [ ] Export в PDF
- [ ] Import чатов из ChatGPT
- [ ] Backup/restore

### Analytics

- [ ] Usage dashboard
- [ ] Token usage analytics
- [ ] Cost tracking

### Monetization (опционально)

- [ ] Subscription plans
- [ ] Usage-based billing
- [ ] API key pool для пользователей без своего ключа

---

## Долгосрочное видение

### Plugins/Extensions

- [ ] Plugin architecture
- [ ] Custom tools integration
- [ ] MCP server support

### Self-hosted

- [ ] Docker image
- [ ] One-click deploy (Railway, Render)
- [ ] Documentation для self-hosting

### Enterprise

- [ ] SSO integration
- [ ] Audit logs
- [ ] Data retention policies
- [ ] On-premise deployment

---

*Этот roadmap — живой документ. Приоритеты могут меняться.*

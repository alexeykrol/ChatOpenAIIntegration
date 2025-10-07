#!/usr/bin/env bash
set -euo pipefail

echo "Автоизменятель. Только пуш."

branch="$(git rev-parse --abbrev-ref HEAD)"
echo "Текущая ветка: $branch"

# Индексируем всё
git add -A

# Коммитим, если есть изменения
if git diff --cached --quiet; then
  echo "Нет изменений для коммита."
else
  git commit -m "Автоматический коммит"
fi

# Пушим в текущую ветку (создаём на origin, если её там нет)
git push -u origin "$branch"

echo "✅ Изменения отправлены в GitHub (ветка: $branch)."
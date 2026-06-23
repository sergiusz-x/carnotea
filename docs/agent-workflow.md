# Agent workflow

Przed każdym git push:

1. `pnpm local:ci` — uruchom wszystkie gaty lokalnie
2. Jeśli coś failuje → napraw zanim pushniesz
3. Dopiero gdy wszystkie przejdą → `git push`

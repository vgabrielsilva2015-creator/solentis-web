# Segundo fator (TOTP) do Super Admin

Vale só para `SUPER_ADMIN`. Aplicativo autenticador (Google Authenticator, Authy, 1Password, Microsoft Authenticator) + 8 códigos de recuperação.

## Como funciona
- Login: e-mail e senha → se a conta tem o 2º fator ativo, a tela pede o código (6 dígitos ou código de recuperação) → só então a sessão é criada.
- O segredo fica no banco **cifrado** (AES-256-GCM). A chave (`MFA_ENCRYPTION_KEY`) fica só na Vercel. Banco vazado sem a chave não serve.
- Cada código de 6 dígitos vale uma vez (anti-replay). 10 códigos errados em 15 min bloqueiam o 2º fator da conta por 15 min, de qualquer IP.
- Cadastrar o autenticador pede a **senha de novo**; ao ativar, as sessões abertas da conta caem.
- Tabelas: `user_mfa`, `mfa_recovery_codes` (RLS ligado na migration `20261008100000_user_mfa`).

## `MFA_ENFORCE` (liga em etapas)
| Valor | Efeito |
|---|---|
| `off` (padrão) | Nada muda. É a alavanca de emergência se o TOTP der problema. |
| `enroll` | Quem já cadastrou precisa do código ao entrar. Quem não cadastrou entra normal e vê um aviso. |
| `required` | Quem não passou pelo 2º fator nesta sessão só alcança `/mfa/cadastro`; nenhuma action de plataforma roda. |

Valor desconhecido (erro de digitação) vira `enroll`. Mudou o modo? Quem já estava logado precisa sair e entrar de novo.

## Ordem para ligar em produção (ação do dono — NÃO VERIFICADO, nada foi feito na produção)
1. Backup do banco. Aplicar a migration (`prisma migrate deploy`, seguindo `docs/MIGRATIONS.md`). Ela só cria 2 tabelas.
2. Gerar a chave: `openssl rand -base64 32`. Vercel → variável **Sensitive** `MFA_ENCRYPTION_KEY`, **valores diferentes em Production e Preview**. Guardar no gerenciador de senhas.
3. Ter **2 super admins** antes de seguir (um perdido não pode trancar o painel).
4. `MFA_ENFORCE=enroll` → redeploy → cada admin entra, abre `/mfa/cadastro`, escaneia o QR, guarda os 8 códigos.
5. Conferir em `/admin/seguranca` que todos aparecem como "Ativo". Testar sair e entrar com o código.
6. `MFA_ENFORCE=required` → redeploy.

## Quando dá problema
- **Perdeu o celular, tem os códigos de recuperação:** entra com um código de recuperação e recadastra pelo reset abaixo ou pede ao outro admin.
- **Perdeu celular e códigos:** `npx tsx scripts/ops/reset-mfa.ts --email <admin> --confirm-host <host do DATABASE_URL>` (precisa de acesso ao banco). Remove o 2º fator da conta e derruba as sessões.
- **Perdeu/trocou a `MFA_ENCRYPTION_KEY`:** nenhum segredo antigo decifra; o login dos admins com MFA falha (fecha, não abre). Ponha `MFA_ENFORCE=off`, entre, e rode o reset de cada admin.
- **Emergência geral:** `MFA_ENFORCE=off` e redeploy devolve o comportamento anterior. Tire de `off` assim que resolver.

## Limites conhecidos
- O E2E usa uma implementação própria validada com os vetores da RFC 6238; **não testei com um aplicativo autenticador real** (conferir no primeiro cadastro).
- Sem a chave configurada, o cadastro mostra um aviso e o login de quem já tem MFA falha (fail-closed).
- O limite de 10 falhas pode atrasar o admin legítimo por até 15 min se alguém tentar códigos na conta dele.
- Reautenticação a cada ação sensível e sessão curta do admin ficam na Fase 3.

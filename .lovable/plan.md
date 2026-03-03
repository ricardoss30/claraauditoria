

## Plano: Remover opção de cadastro da tela de login

Remover o sistema de abas (Entrar/Cadastrar) da página `src/pages/Auth.tsx`, mantendo apenas o formulário de login direto, sem tabs.

### Alterações
**`src/pages/Auth.tsx`**:
- Remover o componente `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- Remover o formulário de cadastro e o state `fullName`
- Remover a função `handleSignup`
- Manter apenas o formulário de login diretamente dentro do `CardContent`


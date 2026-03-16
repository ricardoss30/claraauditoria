
## Ajuste do plano

Eu revisei o código e a configuração atual. O bucket `documents` já está com `file_size_limit = 629145600` (600MB), então a migration aprovada funcionou no nível do bucket.

O motivo mais provável para o erro continuar é este: no Supabase existe também um **limite global de upload do Storage**, e ele **tem prioridade sobre o limite do bucket**. A própria documentação do Supabase confirma isso. Se o limite global estiver em 50MB, por exemplo, o upload continuará falhando mesmo com o bucket em 600MB.

## O que vou ajustar na implementação

1. **Tratar o problema como limite global, não mais como limite do bucket**
   - Manter a migration do bucket como está.
   - Considerar que o bloqueio atual vem da configuração global do Storage no projeto Supabase.

2. **Alinhar o frontend ao limite realmente efetivo**
   - Atualizar a validação do upload para não prometer 600MB se o projeto ainda estiver limitado globalmente.
   - Trocar a mensagem genérica de erro por algo mais claro, por exemplo:
     - “O projeto Supabase ainda está com limite global de upload menor que 600MB.”
     - “Ajuste o limite global do Storage no dashboard do Supabase.”

3. **Melhorar o tratamento de erro no `useDocumentUpload`**
   - Detectar especificamente a mensagem `The object exceeded the maximum allowed size`.
   - Exibir uma mensagem amigável em português explicando que o problema pode estar no limite global do Storage.

4. **Ajustar o texto da UI**
   - Se o ambiente continuar com limite global inferior, corrigir o texto “PDF ou texto até 600MB” para o valor real suportado.
   - Isso evita inconsistência entre a interface e o comportamento real.

## O que precisa ser verificado no Supabase

No dashboard do Supabase, em **Storage Settings**, conferir o campo **Global file size limit**.

Cenários:
- **Se o projeto for Free**: o Supabase limita globalmente a **50MB**, então 600MB não vai funcionar.
- **Se o projeto for Pro/Team/Enterprise**: o limite global pode ser aumentado, e aí o bucket de 600MB passa a valer de fato.

## Resultado esperado após o ajuste

- O sistema deixa de indicar incorretamente que aceita 600MB quando o projeto ainda não aceita.
- O usuário passa a receber uma mensagem de erro correta e compreensível.
- Se o limite global for aumentado no Supabase, o upload grande passa a funcionar sem precisar mexer de novo no bucket.

## Detalhes técnicos

- O código atual de upload em `src/hooks/useDocumentUpload.ts` já valida 600MB no cliente.
- O bucket `documents` já está salvo com 600MB no banco.
- O erro exibido (`The object exceeded the maximum allowed size`) acontece antes do processamento do documento e é compatível com rejeição nativa do Storage.
- Pela documentação do Supabase, o **limite global do Storage prevalece sobre o limite por bucket**.

## Próxima implementação proposta

Vou preparar a correção em duas frentes:
1. **mensagem e validação coerentes no frontend**, e
2. **orientação explícita sobre o limite global do Supabase**, porque esse ajuste não é controlado pela migration do bucket.

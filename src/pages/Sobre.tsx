import { Foto, Mensagem, ok, useConsulta, useTitulo } from '../components/comuns'
import { BUCKET_INSTITUCIONAL, mensagemErro, supabase } from '../lib/supabase'
import type { Institucional } from '../lib/tipos'

export function Sobre() {
  useTitulo('Sobre')
  const { dados: inst, erro, carregando } = useConsulta(
    async () =>
      ok(await supabase.from('institucional').select('id,nome_responsavel,titulo,apresentacao,curriculo,foto_caminho,email,atualizado_em').eq('id', 1).maybeSingle()) as Institucional | null,
    [],
  )

  if (carregando) return <p className="carregando">Carregando…</p>
  if (erro) return <div className="secao"><Mensagem tipo="erro">{mensagemErro(erro)}</Mensagem></div>

  return (
    <article className="sobre">
      <Foto bucket={BUCKET_INSTITUCIONAL} caminho={inst?.foto_caminho} alt={inst?.nome_responsavel || 'Responsável pelo acervo'} />
      <div>
        <h1>{inst?.nome_responsavel || inst?.titulo || 'Relíquias da Família'}</h1>
        {inst?.nome_responsavel && inst.titulo && <p className="cargo">{inst.titulo}</p>}
        {inst?.apresentacao && <div className="corpo">{inst.apresentacao}</div>}
        {inst?.curriculo && (
          <>
            <h2>Trajetória</h2>
            <div className="corpo" style={{ marginTop: 0 }}>{inst.curriculo}</div>
          </>
        )}
        {inst?.email && (
          <>
            <h2>Contato</h2>
            <a className="botao botao--claro" href={`mailto:${inst.email}`}>{inst.email}</a>
          </>
        )}
      </div>
    </article>
  )
}

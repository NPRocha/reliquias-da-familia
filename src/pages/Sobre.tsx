import { Foto, Mensagem, ok, useConsulta, useTitulo } from '../components/comuns'
import { formatarTelefone, linkWhatsApp } from '../lib/formato'
import { BUCKET_INSTITUCIONAL, mensagemErro, supabase, urlImagem } from '../lib/supabase'
import type { Institucional } from '../lib/tipos'

export function Sobre() {
  useTitulo('Sobre')
  const { dados: inst, erro, carregando } = useConsulta(
    async () => ok(await supabase.from('institucional').select('*').eq('id', 1).maybeSingle()) as Institucional | null,
    [],
  )

  if (carregando) return <p className="carregando">Carregando…</p>
  if (erro) return <div className="secao"><Mensagem tipo="erro">{mensagemErro(erro)}</Mensagem></div>

  return (
    <article className="sobre">
      <Foto src={urlImagem(BUCKET_INSTITUCIONAL, inst?.foto_caminho)} alt={inst?.nome_responsavel || 'Responsável pelo acervo'} />
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
        {(inst?.whatsapp || inst?.email) && (
          <>
            <h2>Contato</h2>
            <div className="barra-acoes" style={{ marginTop: 0 }}>
              {inst.whatsapp && (
                <a className="botao botao--whats" href={linkWhatsApp(inst.whatsapp, 'Olá! Vim pelo site Relíquias da Família.')} target="_blank" rel="noopener noreferrer">
                  WhatsApp {formatarTelefone(inst.whatsapp)}
                </a>
              )}
              {inst.email && <a className="botao botao--claro" href={`mailto:${inst.email}`}>{inst.email}</a>}
            </div>
          </>
        )}
      </div>
    </article>
  )
}

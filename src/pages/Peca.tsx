import { useState, type FormEvent } from 'react'
import { Carimbo, Etiqueta, Foto, Mensagem, ok, useConsulta, useTitulo } from '../components/comuns'
import { formatarValor, identificacao, linkWhatsApp, soDigitos } from '../lib/formato'
import { Link } from '../lib/rotas'
import { mensagemErro, supabase, urlFoto } from '../lib/supabase'
import type { Imagem, ObjetoPublico } from '../lib/tipos'

type PecaCompleta = ObjetoPublico & {
  categorias: { nome: string } | null
  estados_conservacao: { descricao: string } | null
  imagens_objetos: Imagem[]
}

const SELECT_PECA =
  'id,codigo,nome,descricao,historia,procedencia,ano_origem,material,dimensoes,categoria_id,estado_conservacao_id,valor_venda,situacao,publico,criado_em,' +
  'categorias(nome),estados_conservacao(descricao),imagens_objetos(id,objeto_id,caminho_storage,legenda,ordem,principal)'

export function Peca({ id }: { id: string }) {
  const { dados, erro, carregando } = useConsulta(async () => {
    const [peca, inst] = await Promise.all([
      supabase.from('objetos').select(SELECT_PECA).eq('id', Number(id)).eq('publico', true).maybeSingle(),
      supabase.from('institucional').select('whatsapp').eq('id', 1).maybeSingle(),
    ])
    return { peca: ok(peca) as unknown as PecaCompleta | null, whatsapp: (ok(inst) as { whatsapp: string | null } | null)?.whatsapp ?? null }
  }, [id])
  const [atual, setAtual] = useState(0)
  useTitulo(dados?.peca?.nome ?? 'Peça')

  if (carregando) return <p className="carregando">Abrindo a ficha…</p>
  if (erro) return <div className="secao"><Mensagem tipo="erro">{mensagemErro(erro)}</Mensagem></div>
  const peca = dados?.peca
  if (!peca) {
    return (
      <div className="vazio">
        <p>Esta peça não está disponível para visualização.</p>
        <Link href="/acervo" className="botao">Voltar ao acervo</Link>
      </div>
    )
  }

  const fotos = [...peca.imagens_objetos].sort((a, b) => Number(b.principal) - Number(a.principal) || a.ordem - b.ordem)
  const foto = fotos[Math.min(atual, fotos.length - 1)]
  const ficha: [string, string | null | undefined][] = [
    ['Época', peca.ano_origem],
    ['Material', peca.material],
    ['Dimensões', peca.dimensoes],
    ['Conservação', peca.estados_conservacao?.descricao],
    ['Categoria', peca.categorias?.nome],
    ['Procedência', peca.procedencia],
  ]

  return (
    <>
      <Link href="/acervo" className="voltar">← Voltar ao acervo</Link>
      <article className="peca">
        <div className="galeria">
          <Foto className="principal" src={urlFoto(foto?.caminho_storage)} alt={foto?.legenda || peca.nome} />
          {foto?.legenda && <p className="legenda">{foto.legenda}</p>}
          {fotos.length > 1 && (
            <div className="miniaturas" role="group" aria-label="Fotos da peça">
              {fotos.map((f, i) => (
                <button key={f.id} type="button" aria-current={i === atual} aria-label={`Foto ${i + 1} de ${fotos.length}`} onClick={() => setAtual(i)}>
                  <Foto src={urlFoto(f.caminho_storage, true)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="peca-cabeca">
            <Etiqueta texto={identificacao(peca)} grande />
            <h1>{peca.nome}</h1>
            <Carimbo situacao={peca.situacao} grande />
            {peca.situacao === 'A_VENDA' && peca.valor_venda != null && <p className="peca-valor">{formatarValor(peca.valor_venda)}</p>}
          </div>
          {peca.descricao && <p className="peca-resumo" style={{ marginTop: 20 }}>{peca.descricao}</p>}

          <dl className="ficha">
            {ficha.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          {peca.situacao === 'A_VENDA' && <FormInteresse peca={peca} whatsapp={dados?.whatsapp ?? null} />}
          {peca.situacao === 'RESERVADO' && (
            <p className="aviso-situacao">Esta peça está reservada para um interessado. Se a negociação não avançar, ela volta a ficar disponível.</p>
          )}
          {peca.situacao === 'VENDIDO' && <p className="aviso-situacao">Esta peça já foi vendida e segue no acervo como registro da coleção.</p>}
        </div>
      </article>

      {peca.historia && (
        <section className="historia" aria-labelledby="t-historia">
          <h2 id="t-historia">A história</h2>
          <div className="corpo">{peca.historia}</div>
        </section>
      )}
    </>
  )
}

function FormInteresse({ peca, whatsapp }: { peca: ObjetoPublico; whatsapp: string | null }) {
  const [nome, setNome] = useState('')
  const [fone, setFone] = useState('')
  const [email, setEmail] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)

  const textoWhats = `Olá! Tenho interesse na peça "${peca.nome}" (${identificacao(peca)}) que vi no site Relíquias da Família: ${location.origin}/peca/${peca.id}`
  const linkWhats = whatsapp ? linkWhatsApp(whatsapp, textoWhats) : null

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const digitos = soDigitos(fone)
    if (nome.trim().length < 2) return setErro('Informe seu nome.')
    if (digitos.length < 10 || digitos.length > 13) return setErro('Informe o WhatsApp com DDD, por exemplo (85) 99999-0000.')
    setEnviando(true)
    const { error } = await supabase.from('interesses').insert({
      objeto_id: peca.id,
      nome: nome.trim(),
      whatsapp: digitos,
      email: email.trim() || null,
      mensagem: mensagem.trim() || null,
    })
    setEnviando(false)
    if (error) return setErro(mensagemErro(error))
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="painel-form" role="status">
        <h2>Interesse registrado</h2>
        <p>Obrigado, {nome.split(' ')[0]}. A família vai entrar em contato pelo WhatsApp informado.</p>
        {linkWhats && (
          <a className="botao botao--whats" href={linkWhats} target="_blank" rel="noopener noreferrer">
            Conversar agora pelo WhatsApp
          </a>
        )}
      </div>
    )
  }

  return (
    <form className="painel-form" onSubmit={enviar} noValidate>
      <h2>Tenho interesse</h2>
      <p>Deixe seu contato. A negociação é feita diretamente com a família, pelo WhatsApp.</p>
      <div className="campos">
        <div className="campo">
          <label htmlFor="i-nome">Nome</label>
          <input id="i-nome" type="text" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} required />
        </div>
        <div className="campo">
          <label htmlFor="i-fone">WhatsApp com DDD</label>
          <input id="i-fone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(85) 99999-0000" value={fone} onChange={(e) => setFone(e.target.value)} required />
        </div>
        <div className="campo">
          <label htmlFor="i-email">E-mail <span className="ajuda">(opcional)</span></label>
          <input id="i-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="i-msg">Mensagem <span className="ajuda">(opcional)</span></label>
          <textarea id="i-msg" value={mensagem} onChange={(e) => setMensagem(e.target.value)} maxLength={1000} placeholder="Alguma pergunta sobre a peça?" />
        </div>
        <Mensagem tipo="erro">{erro}</Mensagem>
        <div>
          <button className="botao" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Registrar interesse'}</button>
        </div>
      </div>
    </form>
  )
}

import { CartaoPeca, COLUNAS_CATALOGO, comCapas } from '../components/CartaoPeca'
import { Etiqueta, Foto, Mensagem, ok, useConsulta, useTitulo } from '../components/comuns'
import { identificacao } from '../lib/formato'
import { Link } from '../lib/rotas'
import { mensagemErro, supabase } from '../lib/supabase'
import type { ObjetoCatalogo } from '../lib/tipos'

/** Página inicial da família e convidados (vendas desligadas). Sem referências a venda. */
export function Inicio() {
  useTitulo('')
  const { dados, erro, carregando } = useConsulta(async () => {
    const [inst, pecas] = await Promise.all([
      supabase.from('institucional').select('titulo,apresentacao').eq('id', 1).maybeSingle(),
      supabase.from('catalogo').select(COLUNAS_CATALOGO).order('criado_em', { ascending: false }).limit(9),
    ])
    return {
      inst: ok(inst) as { titulo: string | null; apresentacao: string | null } | null,
      pecas: await comCapas((ok(pecas) ?? []) as ObjetoCatalogo[]),
    }
  }, [])

  if (carregando) return <p className="carregando">Abrindo o acervo…</p>
  if (erro) return <div className="secao"><Mensagem tipo="erro">{mensagemErro(erro)}</Mensagem></div>

  const inst = dados?.inst
  const pecas = dados?.pecas ?? []
  const destaque = pecas.find((p) => p.capa)
  const recentes = pecas.filter((p) => p !== destaque).slice(0, 8)
  const primeiroParagrafo = inst?.apresentacao?.split(/\n\s*\n/)[0]

  return (
    <>
      <section className="abertura">
        <div>
          <h1>{inst?.titulo || 'Relíquias da Família'}</h1>
          <p className="texto">
            {primeiroParagrafo || 'Objetos guardados por gerações, cada um com sua história, sua origem e as lembranças de quem cuidou deles.'}
          </p>
          <div className="acoes">
            <Link href="/acervo" className="botao">Ver o acervo</Link>
            <Link href="/sobre" className="botao botao--claro">Sobre a família</Link>
          </div>
        </div>
        {destaque && (
          <Link href={`/peca/${destaque.id}`} className="abertura-peca">
            <figure style={{ margin: 0 }}>
              <Foto caminho={destaque.capa} alt={destaque.nome} />
              <Etiqueta texto={identificacao(destaque)} grande />
              <figcaption>{destaque.nome}</figcaption>
            </figure>
          </Link>
        )}
      </section>

      <section className="secao" aria-labelledby="t-recentes">
        <div className="secao-topo">
          <h2 id="t-recentes">Chegaram ao acervo</h2>
          <Link href="/acervo">Ver todas as peças</Link>
        </div>
        {recentes.length === 0 ? (
          <p className="vazio">As primeiras peças estão sendo catalogadas.</p>
        ) : (
          <div className="grade">
            {recentes.map((p) => <CartaoPeca key={p.id} peca={p} />)}
          </div>
        )}
      </section>
    </>
  )
}

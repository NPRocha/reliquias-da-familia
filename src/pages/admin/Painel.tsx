import { Mensagem, useConsulta, useTitulo } from '../../components/comuns'
import { formatarData, formatarTelefone } from '../../lib/formato'
import { Link } from '../../lib/rotas'
import { mensagemErro, supabase } from '../../lib/supabase'

async function contar(filtro: (q: any) => any, tabela = 'objetos') {
  const r = await filtro(supabase.from(tabela).select('id', { count: 'exact', head: true }))
  if (r.error) throw r.error
  return r.count ?? 0
}

export function Painel() {
  useTitulo('Painel')
  const { dados, erro, carregando } = useConsulta(async () => {
    const [total, venda, reservadas, vendidas, novos, recentes] = await Promise.all([
      contar((q) => q),
      contar((q) => q.eq('situacao', 'A_VENDA')),
      contar((q) => q.eq('situacao', 'RESERVADO')),
      contar((q) => q.eq('situacao', 'VENDIDO')),
      contar((q) => q.eq('situacao', 'NOVO'), 'interesses'),
      supabase.from('interesses').select('id,nome,whatsapp,criado_em,objetos(nome)').eq('situacao', 'NOVO').order('criado_em', { ascending: false }).limit(5),
    ])
    if (recentes.error) throw recentes.error
    return { total, venda, reservadas, vendidas, novos, recentes: recentes.data as unknown as { id: number; nome: string; whatsapp: string; criado_em: string; objetos: { nome: string } | null }[] }
  }, [])

  return (
    <>
      <div className="adm-topo">
        <h1>Painel</h1>
        <Link href="/admin/pecas/nova" className="botao">Cadastrar peça</Link>
      </div>
      {erro ? <Mensagem tipo="erro">{mensagemErro(erro)}</Mensagem> : carregando || !dados ? <p className="carregando">Carregando…</p> : (
        <>
          <div className="numeros">
            <Link href="/admin/interesses" className="numero"><strong>{dados.novos}</strong><span>interesses novos</span></Link>
            <Link href="/admin/pecas" className="numero"><strong>{dados.total}</strong><span>peças cadastradas</span></Link>
            <Link href="/admin/pecas?situacao=A_VENDA" className="numero"><strong>{dados.venda}</strong><span>à venda</span></Link>
            <Link href="/admin/pecas?situacao=RESERVADO" className="numero"><strong>{dados.reservadas}</strong><span>reservadas</span></Link>
            <Link href="/admin/pecas?situacao=VENDIDO" className="numero"><strong>{dados.vendidas}</strong><span>vendidas</span></Link>
          </div>
          <section className="adm-bloco">
            <h2>Interesses aguardando contato</h2>
            {dados.recentes.length === 0 ? (
              <p style={{ color: 'var(--tinta-2)', margin: 0 }}>Nenhum interesse novo. Quando alguém clicar em “Tenho interesse”, aparecerá aqui.</p>
            ) : (
              <table className="tabela">
                <tbody>
                  {dados.recentes.map((i) => (
                    <tr key={i.id}>
                      <td><strong>{i.nome}</strong></td>
                      <td>{formatarTelefone(i.whatsapp)}</td>
                      <td>{i.objetos?.nome}</td>
                      <td style={{ color: 'var(--tinta-2)' }}>{formatarData(i.criado_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  )
}

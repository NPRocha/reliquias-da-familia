import { useEffect, useState, type FormEvent } from 'react'
import { Mensagem, useTitulo } from '../../components/comuns'
import { texto, useConfig } from '../../lib/config'
import { mensagemErro, supabase } from '../../lib/supabase'
import { SoAdmin } from './LayoutAdmin'

export function Configuracoes() {
  return (
    <SoAdmin>
      <Formulario />
    </SoAdmin>
  )
}

function Formulario() {
  useTitulo('Configurações')
  const { config, recarregar } = useConfig()
  const [f, setF] = useState({ entrada_frase: '', entrada_convite: '', entrada_aviso: '', vendas_texto: '' })
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mudandoChave, setMudandoChave] = useState(false)

  useEffect(() => {
    setF({
      entrada_frase: texto(config, 'entrada_frase'),
      entrada_convite: texto(config, 'entrada_convite'),
      entrada_aviso: texto(config, 'entrada_aviso'),
      vendas_texto: texto(config, 'vendas_texto'),
    })
  }, [config])

  const campo = (k: keyof typeof f) => ({ value: f[k], onChange: (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value })) })

  async function alternarVendas() {
    const ligar = !config.vendas_ativas
    const aviso = ligar
      ? 'Ligar as vendas?\n\n• O público passa a ver, sem login, as peças "À venda", com preço e "Tenho interesse".\n• Família e convidados passam a ver somente as peças à venda.\n• O acervo completo e a página Sobre ficam visíveis só para a equipe.'
      : 'Desligar as vendas?\n\n• O site volta a ser só da família e convidados, sem nenhuma informação de venda.\n• Os interesses já registrados continuam guardados.'
    if (!confirm(aviso)) return
    setMudandoChave(true)
    setMsg(null)
    const { error } = await supabase.from('configuracoes').update({ vendas_ativas: ligar }).eq('id', 1)
    setMudandoChave(false)
    if (error) return setMsg({ tipo: 'erro', texto: mensagemErro(error) })
    await recarregar()
    setMsg({ tipo: 'ok', texto: ligar ? 'Vendas ligadas.' : 'Vendas desligadas.' })
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const t = (s: string) => s.trim() || null
    setSalvando(true)
    const { error } = await supabase.from('configuracoes').update({
      entrada_frase: t(f.entrada_frase), entrada_convite: t(f.entrada_convite),
      entrada_aviso: t(f.entrada_aviso), vendas_texto: t(f.vendas_texto),
    }).eq('id', 1)
    setSalvando(false)
    if (error) return setMsg({ tipo: 'erro', texto: mensagemErro(error) })
    await recarregar()
    setMsg({ tipo: 'ok', texto: 'Textos salvos.' })
  }

  return (
    <>
      <div className="adm-topo"><h1>Configurações</h1></div>

      <section className={`adm-bloco chave-vendas${config.vendas_ativas ? ' chave-vendas--ligada' : ''}`}>
        <div>
          <h2>Vendas {config.vendas_ativas ? 'ligadas' : 'desligadas'}</h2>
          <p style={{ margin: 0 }}>
            {config.vendas_ativas
              ? 'O público vê as peças “À venda” sem login e pode registrar interesse.'
              : 'O site é só da família e convidados, com login. Nenhuma informação de venda aparece.'}
          </p>
        </div>
        <button type="button" className={`botao ${config.vendas_ativas ? 'botao--perigo' : ''}`} onClick={alternarVendas} disabled={mudandoChave}>
          {mudandoChave ? 'Aguarde…' : config.vendas_ativas ? 'Desligar vendas' : 'Ligar vendas'}
        </button>
      </section>

      <form onSubmit={salvar}>
        <section className="adm-bloco">
          <h2>Textos da tela de entrada</h2>
          <div className="campos">
            <div className="campo">
              <label htmlFor="c-frase">Frase de apresentação</label>
              <textarea id="c-frase" {...campo('entrada_frase')} maxLength={300} />
            </div>
            <div className="campo">
              <label htmlFor="c-convite">Convite acima do formulário</label>
              <textarea id="c-convite" {...campo('entrada_convite')} maxLength={200} style={{ minHeight: 70 }} />
            </div>
            <div className="campo">
              <label htmlFor="c-aviso">Aviso abaixo do formulário</label>
              <input id="c-aviso" type="text" {...campo('entrada_aviso')} maxLength={120} />
            </div>
            <div className="campo">
              <label htmlFor="c-vendas">Aviso com as vendas ligadas</label>
              <input id="c-vendas" type="text" {...campo('vendas_texto')} maxLength={160} />
              <span className="ajuda">Aparece na entrada, acima do botão “Conhecer as peças disponíveis”, e no topo da lista de peças.</span>
            </div>
          </div>
        </section>
        {msg && <Mensagem tipo={msg.tipo}>{msg.texto}</Mensagem>}
        <div className="barra-acoes">
          <button className="botao" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar textos'}</button>
        </div>
      </form>
    </>
  )
}

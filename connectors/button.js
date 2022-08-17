import { useEffect } from 'react'
import { metaMask } from "./metaMask.ts";
import Cookies from 'js-cookie'
import { useWeb3React } from '@web3-react/core'

export const connectWallet = async (slient = false) => {
  let connector = metaMask

  try {
    slient ? await connector.connectEagerly() : await connector.activate()
    Cookies.set('wallet-type', 'metamask')
  } catch (err) {
    console.log('connect wallet err', err)
  }
}

export default function ConnectorButton() {
  const { account, connector } = useWeb3React()

  const login = async () => {
    await connectWallet()
  }

  const logout = async () => {
    if (!connector) {
      return
    }
    if (connector?.deactivate) {
      void connector.deactivate()
    } else {
      void connector.resetState()
    }
    Cookies.remove('wallet-type')
  }

  useEffect(() => {
    if (Cookies.get('wallet-type') === 'metamask') {
      connectWallet(true)
    }
  }, [])

  return <>
    <button style={{
      background: 'linear-gradient(110deg,#4ec0d6,#c7b2c7 65%,#ff6f84)',
      padding: '0 20px',
      borderRadius: '14px',
      height: '40px',
      color: '#000',
      fontWeight: '700'
    }} onClick={account ? logout : login}>{account ? 'Disconnect' : 'Connect Wallet'}</button>
  </>
}

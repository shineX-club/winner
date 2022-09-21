import { useEffect } from 'react'
import { metaMask } from "./metaMask.ts";
import Cookies from 'js-cookie'
import Image from 'next/image';
import { toast } from 'react-toastify'
import { useWeb3React } from '@web3-react/core'

export const convertAddress = (address, pre = 6, sub = 4) => {
  return address.slice(0, pre) + '...' + address.slice(-sub)
}

export const connectWallet = async (slient = false) => {
  let connector = metaMask

  try {
    slient ? await connector.connectEagerly(4) : await connector.activate(5)
    Cookies.set('wallet-type', 'metamask')
  } catch (err) {
    console.log('connect wallet err', err)
  }
}

export default function ConnectorButton() {
  const { account, connector, name, chainId } = useWeb3React()
  const login = async () => {
    if (chainId && chainId.toString() !== '5') {
      toast('Please switch your chain to Rinkeby first!')
    }
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
    <button className='connect-btn' onClick={account ? logout : login}>
      <div>
        {
          account
            ? <div className='avatar'><Image width='25' height='25' src='/img/usage/avatar.jpeg'></Image></div>
            : <Image width='20' height='20' src='/img/usage/cash.svg'></Image>
        }
        <span>{account ? name || convertAddress(account) : 'Connect Wallet'}</span>
      </div>
    </button>
  </>
}

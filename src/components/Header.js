import Link from 'next/link'
import Image from 'next/image'
import ConnectorButton from '../../connectors/button'
import { useCopyToClipboard } from 'react-use'
import { useWeb3React } from '@web3-react/core'
import { toast } from 'react-toastify'

export function Header() {
  const { account, chainId } = useWeb3React()
  const [state, copyToClipboard] = useCopyToClipboard()

  const copyLink = () => {
    if (!account) {
      toast('plesae connect your wallet first')
      return
    }
    copyToClipboard(
      `${window.location.href.split('?')[0]}?share_from=${account}`
    )
    toast('copy success!')
  }

  return <>
    <header className='app-header'>
      <div className='header-left'>
        <Link href='/'>
          <a href='/' className='logo'>
            <Image width='131' height='40' src='/img/usage/logo.svg'></Image>
          </a>
        </Link>
        <div className='links'>
          <Link href='/spaces'>
            <a>Spaces</a>
          </Link>
          <a target='_blank' rel='noreferrer' href='https://goerli.etherscan.io/address/0xF5D226a29b216019894B16Ed5A0F1227bD98E1F5'>Contract</a>
          {/* <Link href='/blog'>
            <a>Blog</a>
          </Link> */}
        </div>
      </div>
      <div className='header-right'>
        <Image
          className='share-to-earn'
          width='127'
          height='51'
          src='/img/usage/share.svg'
          onClick={copyLink}
        ></Image>
        &nbsp;&nbsp;&nbsp;&nbsp;
        <ConnectorButton></ConnectorButton>
      </div>
    </header>
    {
      chainId && chainId.toString() !== '5' && <div className='header-tips'>
        You're viewing data from the test network (Goerli), To use Winner, please switch chainID
      </div>
    }
  </>
}

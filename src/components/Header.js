import Link from 'next/link'
import Image from 'next/image'
import ConnectorButton from '../../connectors/button'

export function Header() {
  return <header className='app-header'>
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
        <Link href='/'>
          <a target='_blank'>Etherscan</a>
        </Link>
        <Link href='/blog'>
          <a>Blog</a>
        </Link>
      </div>
    </div>
    <div className='header-right'>
      <Image width='127' height='51' src='/img/usage/share.svg'></Image>
      &nbsp;&nbsp;&nbsp;&nbsp;
      <ConnectorButton></ConnectorButton>
    </div>
  </header>
}

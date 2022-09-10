import Image from "next/image"

export function Footer(params) {
  return <footer className='app-footer'>
    <div className="app-footer-wrap">
      <div>
        <Image width='131' height='40' src='/img/usage/logo.svg'></Image>
        <p>sinlabs © All rights reserved</p>
      </div>
      <div>
        <div className="social">
          <a href='https://twitter.com/cryptowinnersh' rel='noreferrer' target='_blank'><Image width='28' height='28' src='/img/usage/dt.svg'></Image></a>
          <a href='/' target='_blank'><Image width='28' height='28' src='/img/usage/discord.svg'></Image></a>
        </div>
      </div>
    </div>
  </footer>  
}

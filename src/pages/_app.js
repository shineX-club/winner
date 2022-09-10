import '../css/fonts.css'
import '../css/main.css'
import '../css/global.scss'
import 'rsuite/dist/rsuite.min.css'
import 'focus-visible'
import { useState, useEffect, Fragment } from 'react'
import { Header } from '@/components/Header'
import Router from 'next/router'
import Head from 'next/head'
import ProgressBar from '@badrap/bar-of-progress'
import { ResizeObserver } from '@juggle/resize-observer'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'intersection-observer'
import { Footer } from '@/components/Footer'
import WalletProvider from '../../connectors/wallet'

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  window.ResizeObserver = ResizeObserver
}

const progress = new ProgressBar({
  size: 2,
  color: '#38bdf8',
  className: 'bar-of-progress',
  delay: 100,
})

// this fixes safari jumping to the bottom of the page
// when closing the search modal using the `esc` key
if (typeof window !== 'undefined') {
  progress.start()
  progress.finish()
}

Router.events.on('routeChangeStart', () => progress.start())
Router.events.on('routeChangeComplete', () => progress.finish())
Router.events.on('routeChangeError', () => progress.finish())

export default function App({ Component, pageProps, router }) {
  let [navIsOpen, setNavIsOpen] = useState(false)

  useEffect(() => {
    if (!navIsOpen) return
    function handleRouteChange() {
      setNavIsOpen(false)
    }
    Router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      Router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [navIsOpen])

  useEffect(() => {
    localStorage.setItem('theme', 'dark')
  }, [])

  const Layout = Component.layoutProps?.Layout || Fragment
  const layoutProps = Component.layoutProps?.Layout
    ? { layoutProps: Component.layoutProps, navIsOpen, setNavIsOpen }
    : {}
  const meta = Component.layoutProps?.meta || {}

  if (router.pathname.startsWith('/examples/')) {
    return <Component {...pageProps} />
  }

  let section =
    meta.section ||
    Object.entries(Component.layoutProps?.Layout?.nav ?? {}).find(([, items]) =>
      items.find(({ href }) => href === router.pathname)
    )?.[0]

  return (
    <WalletProvider>
      <Head>
        <title>Winner - A Decentralized NFT Trading Platform</title>
      </Head>
      <Header/>
      <Layout {...layoutProps}>
        <Component section={section} {...pageProps} />
      </Layout>
      <Footer/>
      <ToastContainer
        theme='dark'
        autoClose={5000}
        position="top-right"
        hideProgressBar
      />
    </WalletProvider>
  )
}

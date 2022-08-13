import '../css/fonts.css'
import '../css/main.css'
import 'focus-visible'
import { useState, useEffect, Fragment } from 'react'
import { Header } from '@/components/Header'
import Router from 'next/router'
import ProgressBar from '@badrap/bar-of-progress'
import Head from 'next/head'
import { ResizeObserver } from '@juggle/resize-observer'
import 'intersection-observer'

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
  const showHeader = router.pathname !== '/'
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
    <>
      <Head>
        <title>Winner</title>
        <meta name="description" content="A Smart Contract Powered NFT Gambling Platform"></meta>
        <meta name="keywords" content="crypto,bet,gamble,nft,contract,web3,eth"></meta>
      </Head>
      {showHeader && (
        <Header
          hasNav={Boolean(Component.layoutProps?.Layout?.nav)}
          navIsOpen={navIsOpen}
          onNavToggle={(isOpen) => setNavIsOpen(isOpen)}
          title={meta.title}
          section={section}
        />
      )}
      <Layout {...layoutProps}>
        <Component section={section} {...pageProps} />
      </Layout>
    </>
  )
}

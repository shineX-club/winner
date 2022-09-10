import NextDocument, { Html, Head, Main, NextScript } from 'next/document'

const FAVICON_VERSION = 1

function v(href) {
  return `${href}?v=${FAVICON_VERSION}`
}

export default class Document extends NextDocument {
  static async getInitialProps(ctx) {
    const initialProps = await NextDocument.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="icon" href="/img/favico.png" />
          <meta name="description" content="A decentralized NFT trading platform that supports share-to-earn and leverage"></meta>
          <meta name="keywords" content="crypto,leverage,nft,contract,web3,eth,blockchain,trading,decentralized,share-to-earn"></meta>
        </Head>
        <body>
          <Main />
          <NextScript />
          <script> </script>
        </body>
      </Html>
    )
  }
}

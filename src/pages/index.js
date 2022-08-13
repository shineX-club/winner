import { Testimonials } from '@/components/Testimonials'
import { ReadyMadeComponents } from '@/components/home/ReadyMadeComponents'
import { Logo } from '@/components/Logo'
import { Footer } from '@/components/home/Footer'
import NextLink from 'next/link'
import Head from 'next/head'
import { NavItems } from '@/components/Header'
import styles from './index.module.css'
import clsx from 'clsx'

function Header() {
  return (
    <header className="relative">
      <div className="px-4 sm:px-6 md:px-8">
        <div
          className={clsx(
            'absolute inset-0 bottom-10 bg-bottom bg-no-repeat bg-slate-50 dark:bg-[#0B1120]',
            styles.beams
          )}
        >
          <div
            className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom dark:border-b dark:border-slate-100/5"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent, black)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black)',
            }}
          />
        </div>
        <div className="relative pt-6 lg:pt-8 flex items-center justify-between text-slate-700 font-semibold text-sm leading-6 dark:text-slate-200">
          <Logo className="w-auto h-5" />
          <div className="flex items-center">
            <div className='md:hidden'>
              <button>
                Wallet Connect
              </button>
            </div>
            <div className="hidden md:flex items-center">
              <nav>
                <ul className="flex items-center space-x-8">
                  <NavItems />
                </ul>
              </nav>
              <div className="flex items-center border-l border-slate-200 ml-6 pl-6 dark:border-slate-800">
                <button>
                  Wallet Connect
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="relative max-w-5xl mx-auto pt-20 sm:pt-24 lg:pt-32 pb-20 sm:pb-24 lg:pb-32">
          <h1 className="text-slate-900 font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-center dark:text-white">
            A Smart Contract Powered NFT Gambling Platform
          </h1>
          <p className="mt-6 text-lg text-slate-600 text-center max-w-3xl mx-auto dark:text-slate-400">
            A utility-first CSS framework packed with classes like{' '}
            <code className="font-mono font-medium text-sky-500 dark:text-sky-400">flex</code>,{' '}
            <code className="font-mono font-medium text-sky-500 dark:text-sky-400">pt-4</code>,{' '}
            <code className="font-mono font-medium text-sky-500 dark:text-sky-400">
              text-center
            </code>{' '}
            and{' '}
            <code className="font-mono font-medium text-sky-500 dark:text-sky-400">rotate-90</code>{' '}
            that can be composed to build any design, directly in your markup.
          </p>
          <div className="mt-6 sm:mt-10 flex justify-center space-x-6 text-sm">
            <NextLink href="/">
              <a className="bg-slate-900 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 text-white font-semibold h-12 px-6 rounded-lg w-full flex items-center justify-center sm:w-auto dark:bg-sky-500 dark:highlight-white/20 dark:hover:bg-sky-400">
                Get started
              </a>
            </NextLink>
          </div>
        </div>
      </div>
    </header>
  )
}

export default function Home() {
  return (
    <>
      <Head>
        <meta
          key="twitter:title"
          name="twitter:title"
          content="Tailwind CSS - Rapidly build modern websites without ever leaving your HTML."
        />
        <meta
          key="og:title"
          property="og:title"
          content="Tailwind CSS - Rapidly build modern websites without ever leaving your HTML."
        />
        <title>Tailwind CSS - Rapidly build modern websites without ever leaving your HTML.</title>
      </Head>
      <div className="space-y-20 overflow-hidden sm:space-y-32 md:space-y-40">
        <Header />
      </div>
      <div className="mb-20 space-y-20 overflow-hidden sm:mb-32 sm:space-y-32 md:mb-40 md:space-y-40">
        <ReadyMadeComponents />
      </div>
      <Footer />
    </>
  )
}

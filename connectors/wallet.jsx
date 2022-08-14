import { Web3ReactProvider } from '@web3-react/core'
import { hooks as metaMaskHooks, metaMask } from './metaMask.ts'

const connectors = [
  [metaMask, metaMaskHooks],
]

export default function WalletProvider({ children }) {
  return (
    <Web3ReactProvider connectors={connectors}>
      {children}
    </Web3ReactProvider>
  )
}

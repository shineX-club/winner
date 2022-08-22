import { useWeb3React } from "@web3-react/core"
import { useEffect } from "react"
import { ethers } from 'ethers'
import { contract } from "connectors/contract"

export default function Spaces() {
  const { provider } = useWeb3React()
  // getGamblingCount

  const getTotal = async () => {
    if (!provider) {
      return
    }
    console.log('contract', contract)
    const newContract = contract.connect(
      provider.getSigner()
    )
    const total = await newContract.getGamblingCount()

    console.log(total.toString())

    const record = await newContract.getGamblingRecord(0)
    console.log(record)

    const status = await newContract.getGamblingStatus(0)
    console.log(status)
  }

  useEffect(() => {
    getTotal()
  }, [provider])

  return <>
    <p>spaces</p>
  </>
}

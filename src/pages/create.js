import { useState } from 'react'
import { useWeb3React } from '@web3-react/core'
import { ethers } from 'ethers'
import contractABI from '../../NFTGambling.json'
import { toast } from 'react-toastify'

const pad = (number) => {
  if (String(number).length === 1) {
    return `0${number}`
  }

  return number
}

const convertDate = (ts) => {
  const time = new Date(ts).toLocaleDateString()

  const arr = time.split('/')

  return arr[0] + '-' + pad(arr[1]) + '-' + pad(arr[2])
}

export default function Create() {
  const { account, provider } = useWeb3React()
  const [config, setConfig] = useState({
    minFundraisingAmount: 200,
    initiatorWinProbability: 3000,
    fundraisingStartTime: convertDate(Date.now()),
    deadline: convertDate(Date.now() + 86400 * 1000 * 3),
    minCounterpartyBid: 1,
    maxCounterpartyBid: 100,
  })

  const createGamble = async () => {
    if (!account) {
      toast("Please Connect Wallet First !")
      return
    }

    const contract = new ethers.Contract(
      '0x57488636B59a1eb6066a931D05e913c866bE54E2',
      contractABI,
      provider
    )

    const newContract = await contract.connect(
      provider.getSigner()
    )

    const convertConfig = {
      ...config,
      fundraisingStartTime: new Date(config.fundraisingStartTime).getTime(),
      deadline: new Date(config.deadline).getTime()
    }

    console.log(convertConfig)

    const estimateGas = await newContract.estimateGas.createGambling(convertConfig)

    console.log(ethers.utils.formatEther(estimateGas))

    const tx = await newContract.createGambling(convertConfig)
    console.log("tx", tx);

    const receipt = await tx.wait();
    console.log("receipt", receipt);

    window.location.href = `https://rinkeby.etherscan.io/tx/${receipt.transactionHash}`
  }

  return <>
    <main className="max-w-[52rem] mx-auto px-4 pb-28 sm:px-6 md:px-8 xl:px-12 lg:max-w-6xl">
      <div>
        <div className="md:grid md:grid-cols-3 md:gap-6 mt-10">
          <div className="md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6">Create Gamble</h3>
              <p className="mt-1 text-sm text-white-600">This information will be displayed publicly so be careful what you share.</p>
            </div>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
      
                <div>
                  <div className="col-span-3 sm:col-span-2">
                    <label htmlFor="minFundraisingAmount" className="block text-sm font-medium text-gray-700"> Min fundraising amount </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        name="minFundraisingAmount"
                        id="minFundraisingAmount"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                        value={config.minFundraisingAmount}
                        onChange={(evt) => setConfig({
                          ...config,
                          minFundraisingAmount: evt.target.value
                        })}
                      />
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm"> ETH </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">最小集资金额，只有在到达deadline之前募集够足够的金额，才能开始赌局.</p>
                  </div>
                </div>

                <div>
                  <div className="col-span-3 sm:col-span-2">
                    <label htmlFor="initiatorWinProbability" className="block text-sm font-medium text-gray-700"> Initiator win probability </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="number"
                        max="10000"
                        min="1"
                        name="initiatorWinProbability"
                        id="initiatorWinProbability"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300"
                        value={config.initiatorWinProbability}
                        onChange={(evt) => setConfig({
                          ...config,
                          initiatorWinProbability: evt.target.value
                        })}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">发起者获胜的概率，分母是10000</p>
                  </div>
                </div>

                <div>
                  <div className="col-span-3 sm:col-span-2">
                    <label htmlFor="fundraisingStartTime" className="block text-sm font-medium text-gray-700"> Fundraising start time </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="date"
                        name="fundraisingStartTime"
                        id="fundraisingStartTime"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300"
                        value={config.fundraisingStartTime}
                        onChange={(evt) => setConfig({
                          ...config,
                          fundraisingStartTime: evt.target.value
                        })}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">在到达deadline之前，只要筹足了minFundraisingAmount，可以随时开始</p>
                  </div>
                </div>

                <div>
                  <div className="col-span-3 sm:col-span-2">
                    <label htmlFor="deadline" className="block text-sm font-medium text-gray-700"> Deadline </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="date"
                        name="deadline"
                        id="deadline"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300"
                        value={config.deadline}
                        onChange={(evt) => setConfig({
                          ...config,
                          deadline: evt.target.value
                        })}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">如果到达了deadline仍然没有摇奖，那么游戏结束，用户可以把钱提走，发起者也可以把NFT提走</p>
                  </div>
                </div>

                <div>
                  <div className="col-span-3 sm:col-span-2">
                    <label htmlFor="minCounterpartyBid" className="block text-sm font-medium text-gray-700"> Min counterparty bid </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        name="minCounterpartyBid"
                        id="minCounterpartyBid"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                        value={config.minCounterpartyBid}
                        onChange={(evt) => setConfig({
                          ...config,
                          minCounterpartyBid: evt.target.value
                        })}
                      />
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm"> ETH </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">最小的对手出价，如果为0，则无限制.</p>
                  </div>
                </div>

                <div>
                  <div className="col-span-3 sm:col-span-2">
                    <label htmlFor="maxCounterpartyBid" className="block text-sm font-medium text-gray-700"> Max counterparty bid </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        name="maxCounterpartyBid"
                        id="maxCounterpartyBid"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300"
                        value={config.maxCounterpartyBid}
                        onChange={(evt) => setConfig({
                          ...config,
                          maxCounterpartyBid: evt.target.value
                        })}
                      />
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm"> ETH </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">最大的对手出价，如果为0，则无限制</p>
                  </div>
                </div>

              </div>
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onClick={() => createGamble()}>Create</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </>
}

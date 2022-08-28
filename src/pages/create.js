import { useState } from 'react'
import { useWeb3React } from '@web3-react/core'
import { contract } from 'connectors/contract'
import { ethers } from 'ethers'
import { toast } from 'react-toastify'
import { Button } from 'rsuite'

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

const convertTime = (time) => {
  return parseInt(new Date(time).getTime() / 1000)
}

export default function Create() {
  const { account, provider } = useWeb3React()
  const [config, setConfig] = useState({
    // 最小集资金额
    minFundraisingAmount: '0.01',
    creatorWinProbability: 3000,
    fundraisingStartTime: convertDate(Date.now()),
    deadline: convertDate(Date.now() + 86400 * 1000 * 3),
    // 最小出资金额
    minCounterpartyBid: '',
    // 最大出资金额
    maxCounterpartyBid: '',
    chainRandomMode: true
  })
  const [submiting, setSubmiting] = useState(false)

  const createGamble = async () => {
    try {
      if (!account || !provider) {
        toast("Please Connect Wallet First !")
        return
      }

      const newContract = await contract.connect(
        provider.getSigner()
      )

      const convertConfig = {
        minFundraisingAmount: ethers.FixedNumber.from(config.minFundraisingAmount),
        creatorWinProbability: ethers.BigNumber.from(config.creatorWinProbability),
        maxCounterpartyBid: ethers.FixedNumber.from(config.maxCounterpartyBid || 0),
        minCounterpartyBid: ethers.FixedNumber.from(config.minCounterpartyBid || 0),
        fundraisingStartTime: ethers.BigNumber.from(convertTime(config.fundraisingStartTime)),
        deadline: ethers.BigNumber.from(convertTime(config.deadline)),
        chainRandomMode: config.chainRandomMode
      }

      if (convertConfig.deadline * 1000 <= Date.now()) {
        toast('Deadline 时间不对', {
          type: 'error'
        })
        return
      }

      if (convertConfig.deadline <= convertConfig.fundraisingStartTime) {
        toast('时间区间不对', {
          type: 'error'
        })
        return
      }

      if (
        parseFloat(convertConfig.maxCounterpartyBid.toString()) < 0 ||
        parseFloat(convertConfig.minCounterpartyBid.toString()) < 0 ||
        parseFloat(convertConfig.minFundraisingAmount.toString()) <= 0 ||
        parseFloat(convertConfig.maxCounterpartyBid.toString()) < parseFloat(convertConfig.minCounterpartyBid.toString()) ||
        parseFloat(convertConfig.maxCounterpartyBid.toString()) > parseFloat(convertConfig.minFundraisingAmount.toString())
      ) {
        toast('出资金额不对', {
          type: 'error'
        })
        return
      }

      if (
        parseFloat(convertConfig.creatorWinProbability.toString()) < 1 ||
        parseFloat(convertConfig.creatorWinProbability.toString()) > 10000
      ) {
        toast('胜出区间不对', {
          type: 'error'
        })
        return
      }

      setSubmiting(true)
      console.log('convertConfig', convertConfig)
      const estimateGas = await newContract.estimateGas.createGambling(convertConfig)
      console.log(ethers.utils.formatEther(estimateGas))
      toast('合约提交中')
      const tx = await newContract.createGambling(convertConfig)
      console.log("tx", tx);
      toast('合约部署中')
      const receipt = await tx.wait();
      console.log("receipt", receipt);
      toast('合约部署成功')
      setTimeout(() => {
        window.location = `/game/${receipt.events[0].args.id.toString()}?from=create`
      }, 1500)
    } catch (err) {
      console.log('createGamble', err)
      setSubmiting(false)
    }
  }

  return <>
    <main className="max-w-[52rem] mx-auto px-4 pb-28 sm:px-6 md:px-8 xl:px-12 lg:max-w-6xl">
      <div>
        <div className="md:grid md:grid-cols-3 md:gap-6 mt-10">

          <div className="md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6">Profile</h3>
              <p className="mt-1 text-sm text-gray-600">This information will be displayed publicly so be careful what you share.</p>
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
                    <label htmlFor="creatorWinProbability" className="block text-sm font-medium text-gray-700"> Initiator win probability </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="number"
                        max="10000"
                        min="1"
                        name="creatorWinProbability"
                        id="creatorWinProbability"
                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300"
                        value={config.creatorWinProbability}
                        onChange={(evt) => setConfig({
                          ...config,
                          creatorWinProbability: evt.target.value
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
                    <fieldset>
                      <div className="text-base font-medium text-gray-900" aria-hidden="true">Chain Random Mode</div>
                      <div className="mt-4 space-y-4">
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                            onChange={(evt) => setConfig({
                              ...config,
                              chainRandomMode: true
                            })}
                            id="random-onchain" name="random-mode" type="radio" checked value={config.chainRandomMode} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="random-onchain" className="font-medium text-gray-700"> Use OnChain(block) Random </label>
                            <p className="text-gray-500">on chain mode tips.</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                            onChange={(evt) => setConfig({
                              ...config,
                              chainRandomMode: false
                            })}
                            id="random-vrf" name="random-mode" type="radio" value={config.chainRandomMode} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="random-vrf" className="font-medium text-gray-700"> Use Chianlink(VRF) Random </label>
                            <p className="text-gray-500">vrf mode tips.</p>
                          </div>
                        </div>
                      </div>
                    </fieldset>
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
                <Button color='blue' loading={submiting} appearance="primary" onClick={() => createGamble()}>Create</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </>
}

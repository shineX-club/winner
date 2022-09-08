import { useState } from 'react'
import { useWeb3React } from '@web3-react/core'
import { contract } from 'connectors/contract'
import { ethers } from 'ethers'
import { toast } from 'react-toastify'
import { Button, Input, InputNumber, InputGroup, Slider } from 'rsuite'
import Image from 'next/image'
import { DateRangePicker } from 'rsuite'
import startOfWeek from 'date-fns/startOfWeek';
import endOfWeek from 'date-fns/endOfWeek';
import endOfDay from 'date-fns/endOfDay'
import addDays from 'date-fns/addDays';

const pad = (number) => {
  if (String(number).length === 1) {
    return `0${number}`
  }

  return number
}

const predefinedRanges = [
  {
    label: 'Today',
    value: [new Date(), endOfDay(new Date())]
  },
  {
    label: 'Next three day',
    value: [new Date(), addDays(endOfDay(new Date()), 3)]
  },
  {
    label: 'This week',
    value: [new Date(), endOfWeek(new Date())]
  },
  {
    label: 'Next week',
    closeOverlay: false,
    value: value => {
      const [start = new Date()] = value || [];
      return [
        addDays(startOfWeek(start, { weekStartsOn: 0 }), 7),
        addDays(endOfWeek(start, { weekStartsOn: 0 }), 7)
      ];
    }
  }
]

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

  const setTimeRange = (range) => {
    setConfig({
      ...config,
      fundraisingStartTime: convertTime(range[0]),
      deadline: convertTime(range[1])
    })
  }

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

  return <div className='create-container'>
    <div className='banner'>
      <Image width='561' height='90' src='/img/usage/create-banner.svg'></Image>
    </div>
    <div className='form-item'>
      <div className='title'>Set time</div>
      <div className='desc'>在到达deadline之前，只要筹足了最小筹集资金，可以随时开始;如果到达了deadline仍然没有摇奖，那么游戏结束，用户可以把钱提走，发起者也可以把NFT提走</div>
      <div className='input'>
        <DateRangePicker
          format="yyyy-MM-dd HH:mm:ss"
          placeholder="Select Date Range"
          ranges={predefinedRanges}
          onChange={setTimeRange}
          defaultCalendarValue={[new Date(Date.now() + 1800000), new Date(Date.now() + 86400 * 2000)]}
        />
      </div>
    </div>

    <div className='form-item'>
      <div className='title'>Target price</div>
      <div className='desc'>最小集资金额，只有在到达deadline之前募集够足够的金额，才能开始赌局.</div>
      <div className='input'>
        <InputGroup>
          <InputNumber
            step={0.01}
            value={config.minFundraisingAmount}
            onChange={(minFundraisingAmount) => setConfig({ ...config, minFundraisingAmount })}
          />
          <InputGroup.Addon>
            <Image src='/img/usage/eth.png' width='16' height='16'></Image>
            <span>ETH</span>
          </InputGroup.Addon>
        </InputGroup>
      </div>
    </div>

    <div className='form-item'>
      <div className='title'>Chain Random Mode</div>
      <div className='desc'>在到达deadline之前，只要筹足了最小筹集资金，可以随时开始;如果到达了deadline仍然没有摇奖，那么游戏结束，用户可以把钱提走，发起者也可以把NFT提走</div>
      <div className='input'>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              onChange={(evt) => setConfig({
                ...config,
                chainRandomMode: true
              })}
              id="random-onchain" name="random-mode" type="radio" checked value={config.chainRandomMode} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" />
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
              id="random-vrf" name="random-mode" type="radio" value={config.chainRandomMode} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="random-vrf" className="font-medium text-gray-700"> Use Chianlink(VRF) Random </label>
            <p className="text-gray-500">vrf mode tips.</p>
          </div>
        </div>
      </div>
    </div>

    <div className='double-form'>
      <div className='form-item'>
        <div className='title'>Floor price</div>
        <div className='desc'>在到达deadline之前，只要筹足了最小筹集资金，可以随时开始;如果到达了deadline仍然没有摇奖，那么游戏结束，用户可以把钱提走，发起者也可以把NFT提走</div>
        <div className='input'>
          <InputGroup>
            <InputNumber
              step={0.01}
              value={config.minCounterpartyBid}
              onChange={(minCounterpartyBid) => setConfig({ ...config, minCounterpartyBid })}
            />
            <InputGroup.Addon>
              <Image src='/img/usage/eth.png' width='16' height='16'></Image>
              <span>ETH</span>
            </InputGroup.Addon>
          </InputGroup>
        </div>
      </div>
      <div className='form-item'>
        <div className='title'>Ceil price</div>
        <div className='desc'>在到达deadline之前，只要筹足了最小筹集资金，可以随时开始;如果到达了deadline仍然没有摇奖，那么游戏结束，用户可以把钱提走，发起者也可以把NFT提走</div>
        <div className='input'>
          <InputGroup>
            <InputNumber
              step={0.01}
              value={config.maxCounterpartyBid}
              onChange={(maxCounterpartyBid) => setConfig({ ...config, maxCounterpartyBid })}
            />
            <InputGroup.Addon>
              <Image src='/img/usage/eth.png' width='16' height='16'></Image>
              <span>ETH</span>
            </InputGroup.Addon>
          </InputGroup>
        </div>
      </div>
    </div>

    <div className='form-item'>
      <div className='title'>Initiator win probability</div>
      <div className='desc'>设置发起者获胜的概率</div>
      <div className='input'>
        <Slider
          defaultValue={config.creatorWinProbability / 100}
          min={1}
          step={1}
          max={100}
          progress
          tooltip={false}
          handleTitle={`${config.creatorWinProbability / 100}%`}
          onChange={(val) => {
            setConfig({
              ...config,
              creatorWinProbability: val * 100
            })
          }}
        />
      </div>
    </div>

    <Button color='blue' loading={submiting} appearance="primary" onClick={() => createGamble()}>Create</Button>
  </div>
}

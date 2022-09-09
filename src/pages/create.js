import { useState, useMemo } from 'react'
import { useWeb3React } from '@web3-react/core'
import { contract } from 'connectors/contract'
import { ethers } from 'ethers'
import { toast } from 'react-toastify'
import { Button, Radio, RadioGroup, Form, Input, InputNumber, InputGroup, Slider } from 'rsuite'
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
  const [submitting, setSubmitting] = useState(false)

  const setTimeRange = (range) => {
    setConfig({
      ...config,
      fundraisingStartTime: convertTime(range[0]),
      deadline: convertTime(range[1])
    })
  }

  const createGamble = async () => {
    try {
      if (submitting) {
        return
      }

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

      setSubmitting(true)
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
      setSubmitting(false)
    }
  }

  const setMaxCounterpartyBid = (val) => {
    console.log('setMaxCounterpartyBid', val)
    if (typeof maxUserCount === 'string') {
      return
    }
    const maxCounterpartyBid = maxUserCount / val * config.minCounterpartyBid
    setConfig({ ...config, maxCounterpartyBid })
  }

  const maxUserCount = useMemo(() => {
    if (config.minCounterpartyBid && config.minFundraisingAmount) {
      return Math.floor(config.minFundraisingAmount / config.minCounterpartyBid)
    }

    return 'please set price'
  }, [config])

  const minUserCount = useMemo(() => {
    if (config.minFundraisingAmount && config.maxCounterpartyBid) {
      return Math.floor(config.minFundraisingAmount / config.maxCounterpartyBid)
    }

    return ''
  }, [config])

  return <div className='create-container'>
    <div className='banner'>
      <Image width='561' height='90' src='/img/usage/create-banner.svg'></Image>
    </div>

    <div className='double-form'>
      <div className='form-item'>
        <div className='title'>Set Date Range</div>
        <div className='desc'>拍卖时间段</div>
        <div className='input'>
          <DateRangePicker
            size='lg'
            block
            format="yyyy-MM-dd HH:mm:ss"
            placeholder="Select Date Range"
            ranges={predefinedRanges}
            onChange={setTimeRange}
            defaultCalendarValue={[new Date(Date.now() + 1800000), new Date(Date.now() + 86400 * 2000)]}
          />
        </div>
      </div>
      <div className='form-item'></div>
    </div>

    <div className='double-form price-form'>
      <div className='form-item'>
        <div className='intro'>
          <div className='title'>Floor price</div>
          <div className='desc'>你愿意卖出的最低价格（建议低于市场价），大多数情况下你的 NFT 会以这个价格出售</div>
        </div>
        <div className='input'>
          <InputGroup size='lg'>
            <InputNumber
              step={0.01}
              min={0}
              value={config.minCounterpartyBid}
              onChange={(minCounterpartyBid) => setConfig({ ...config, minCounterpartyBid, maxCounterpartyBid: '' })}
            />
            <InputGroup.Addon>
              <Image src='/img/usage/eth.png' width='16' height='16'></Image>
              <span>ETH</span>
            </InputGroup.Addon>
          </InputGroup>
        </div>
      </div>

      <div className='form-item'>
        <div className='intro'>
          <div className='title'>Ceil price</div>
          <div className='desc'>你想要卖出的最高金额（应该高于市场价），有很小的概率你的 NFT 会以这个价格出售</div>
        </div>
        <div className='input'>
          <InputGroup size='lg'>
            <InputNumber
              step={0.01}
              min={0}
              value={config.minFundraisingAmount}
              onChange={(minFundraisingAmount) => setConfig({ ...config, minFundraisingAmount, maxCounterpartyBid: '' })}
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
      <div className='title'>Ceil price probability</div>
      <div className='desc'>设置有多大的概率可以以最高价格出售，这个概率越低买家就越多，概率越高买家就越少</div>
      <div className='input'>
        <Slider
          defaultValue={config.creatorWinProbability / 100}
          min={1}
          step={1}
          max={100}
          progress
          className="custom-slider"
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

    <div className='double-form'>
      <div className='form-item'>
        <div className='title'>Min user count (optional)</div>
        <div className='desc'>最少可以参与拍卖的人数（当你希望有更多的人可以参与拍卖时可以设置这个参数）</div>
        <div className='input'>
          <InputNumber
            size='lg'
            step={1}
            max={typeof maxUserCount === 'string' ? 1 : maxUserCount}
            min={1}
            value={minUserCount}
            onChange={setMaxCounterpartyBid}
          />
        </div>
      </div>
      <div className='form-item'>
        <div className='title'>Max user count (autofill)</div>
        <div className='desc'>最多可以参与拍卖的人数（由 Floor price 和 Ceil price 自动计算无需手动指定）</div>
        <div className='input'>
          <Input
            size='lg'
            disabled
            value={maxUserCount}
          />
        </div>
      </div>
    </div>

    <Form.Group controlId="radioList">
      <RadioGroup name="radioList" defaultValue={config.chainRandomMode} onChange={(chainRandomMode) => {
        setConfig({ ...config, chainRandomMode })
      }}>
        <div className='form-item'>
          <div className='title'>Chain Random Mode</div>
          <div className='desc'>选择判断结果的随机方式，每种方式都能够保障结果的随机性，各有优劣</div>
          <div className='radio-form'>
            <Radio value={true}>
              <div className='radio-bg'>
                <div className='radio-title'>Use OnChain(block) Random</div>
                <div className='radio-desc'>随机性较安全，且免费</div>
              </div>
            </Radio>
            <Radio value={false}>
              <div className='radio-bg'>
                <div className='radio-title'>Use Chianlink(VRF) Random</div>
                <div className='radio-desc'>随机性更安全，但更贵</div>
              </div>
            </Radio>
          </div>
        </div>
      </RadioGroup>
    </Form.Group>

    <button className='linear-btn' onClick={() => createGamble()}>Create</button>
  </div>
}

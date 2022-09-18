import { ethers } from 'ethers'
import { useRouter } from 'next/router'
import { useEffect, useState, useMemo } from 'react'
import { contract } from 'connectors/contract'
import { useWeb3React } from '@web3-react/core'
import { Progress, InputNumber } from 'rsuite'
import SelectNFTModal from '@/components/SelectNFTModal'
import { toast } from 'react-toastify'
import NFTBox from '@/components/NFTBox'
import Image from 'next/image'
import FlowList from '@flowlist/react-flowlist'
import classnames from 'classnames'

export const convertAddress = (address, pre = 6, sub = 4) => {
  return address.slice(0, pre) + '...' + address.slice(-sub)
}

export default function Game() {
  const router = useRouter()
  const { id, from } = router.query
  const { account, provider } = useWeb3React()
  const [selected, setSelected] = useState([])
  const [game, setGame] = useState(null)
  const [config, setConfig] = useState(null)
  const [setting, setSetting] = useState(null)
  const [value, setValue] = useState(0)
  const [myBid, setMyBid] = useState(0)
  const [index, setIndex] = useState(0)
  const [claimingNFTList, setClaimingNFTList] = useState({})
  const [loadingState, setLoadingState] = useState({
    claimAllNFT: false,
    claimETH: false,
    join: false,
    play: false,
    init: true
  })
  const [showSelect, setShowSelect] = useState(false)

  const getGame = async () => {
    try {
      if (!provider || !account || !id || game) {
        return
      }
  
      console.log('getGame', id)
      const newContract = contract.connect(provider.getSigner())

      const [result, setting] = await Promise.all([
        newContract.getGamblingStatus(id),
        newContract.getCoreConfig()
      ])
      const convertSetting = {
        ...setting,
        participantJoinFeeRatio: 10000 - setting.participantJoinFeeRatio.toString()
      }
      const convertConfig = {
        minCounterpartyBid: ethers.utils.formatEther(result.record.config.minCounterpartyBid),
        maxCounterpartyBid: ethers.utils.formatEther(result.record.config.maxCounterpartyBid),
        minFundraisingAmount: ethers.utils.formatEther(result.record.config.minFundraisingAmount),
        maxFundraisingAmount: ethers.utils.formatEther(result.record.config.maxFundraisingAmount),
        fundraisingAmount: ethers.utils.formatEther(result.fundraisingAmount),
        creatorWinProbability: parseFloat(result.record.config.creatorWinProbability.toString()),
        chainRandomMode: result.record.config.chainRandomMode,
        fundraisingStartTime: result.record.config.fundraisingStartTime.toString() * 1000,
        deadline: result.record.config.deadline.toString() * 1000
      }
      setSetting(convertSetting)
      setConfig(convertConfig)
      setGame(result)
      console.log('game', result)
      console.log('config', convertConfig)
      console.log('setting', convertSetting)
    } catch (err) {
      console.log('getGame', err);
    }
  }

  const getMyBid = async () => {
    if (!provider || !account || !id) {
      return
    }
    const newContract = contract.connect(provider.getSigner())
    const result = await newContract.getETHItem(id, account)
    setMyBid(parseFloat(result.toString()))
    console.log('myBid', parseFloat(result.toString()))
  }

  const getUsers = ({ page }) => new Promise(async (resolve, reject) => {
    try {
      console.log('getUsers', id, page * 10, 10)
      const newContract = contract.connect(provider.getSigner())
      const list = await newContract.listETHItems(
        ethers.BigNumber.from(id),
        ethers.BigNumber.from((page - 1) * 10),
        ethers.BigNumber.from(10)
      )
      resolve({
        noMore: list.length < 10,
        total: parseFloat(game?.counterpartyCount.toString()),
        result: list.map(_ => {
          return {
            address: _.account,
            amount: ethers.utils.formatEther(_.amount)
          }
        })
      })
    } catch (err) {
      console.log('getUsers', err)
      reject(err)
    }
  })

  const joinGame = async () => {
    try {
      if (!gameJoinable) {
        toast('现在不能加入游戏')
        return
      }
  
      if (game.record.creator === account) {
        toast('创建者不能加入游戏')
        return
      }
  
      const numVal = (parseFloat(value) || parseFloat(config?.minCounterpartyBid)).toFixed(5)
      if (numVal < minOffer) {
        toast('不能小于最小值')
        return
      }
  
      if (maxOffer < numVal) {
        toast('不能大于最大值')
        return
      }

      setLoadingState({
        ...loadingState,
        join: true
      })
      const newContract = contract.connect(provider.getSigner())
      const referer = window.__share_from__ || '0x0000000000000000000000000000000000000000'
      const tx = await newContract.joinGambling(id, referer, {
        value: ethers.utils.parseEther(
          numVal.toString()
        ).add(ethers.utils.parseEther(numVal).div(10000).mul(10000 - setting.participantJoinFeeRatio))
      })
  
      console.log("tx", tx);
      const receipt = await tx.wait();
      console.log("receipt", receipt);
      window.location.reload()
    } catch (err) {
      console.log('joinGame', err)
    } finally {
      setLoadingState({
        ...loadingState,
        join: false
      })
    }
  }

  const playGame = async () => {
    try {
      if (!gamePlayable) {
        toast('现在不能开启游戏')
        return
      }

      setLoadingState({
        ...loadingState,
        play: true
      })
      const newContract = contract.connect(provider.getSigner())
      let tx
      if (config.chainRandomMode) {
        tx = await newContract.playGambling(id)
      } else {
        const randomFee = await newContract.gammblingFee()
        console.log('randomFee', randomFee)
        tx = await newContract.playGambling(id, {
          value: randomFee
        })
      }
      console.log("tx", tx);
      const receipt = await tx.wait();
      console.log("receipt", receipt);
      toast('开奖成功！')
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      console.log('playGame', err)
    } finally {
      setLoadingState({
        ...loadingState,
        play: false
      })
    }
  }

  const claimAllNFT = async () => {
    try {
      if (gameStatus !== 'ended' && gameStatus !== 'Finshed') {
        toast('现在不能 claim')
        return
      }

      if (gameStatus === 'ended' && !isOwner) {
        toast('创建者才可以 claim')
        return
      }

      if (gameStatus === 'Finshed' && !isWinner) {
        toast('胜利者才可以 claim')
        return
      }

      if (!selected.filter(_ => !_.tombstone).length) {
        toast('已经全部 claim 了')
        return
      }

      if (Object.values(claimingNFTList).filter(_ => _).length) {
        toast('正在 claim')
        return
      }

      setLoadingState({
        ...loadingState,
        claimAllNFT: true
      })

      const newContract = contract.connect(provider.getSigner())
      const tx = await newContract.claimGamblingNFTs(id)
  
      console.log("tx", tx);
  
      const receipt = await tx.wait();
      console.log("receipt", receipt);
    } catch (err) {
      console.log("claimAllNFT", err);
    } finally {
      setLoadingState({
        ...loadingState,
        claimAllNFT: false
      })
    }
  }

  const startAppendNFT = () => {
    setShowSelect(true)
  }

  const claimOneNFT = async (nft, index) => {
    try {
      if (gameStatus !== 'ended' && gameStatus !== 'Finshed') {
        toast('现在不能 claim')
        return
      }

      if (gameStatus === 'ended' && !isOwner) {
        toast('创建者才可以 claim')
        return
      }

      if (gameStatus === 'Finshed' && !isWinner) {
        toast('胜利者才可以 claim')
        return
      }

      if (loadingState.claimAllNFT) {
        toast('正在 claim')
        return
      }

      if (claimingNFTList[nft.id] || nft.tombstone) {
        return
      }

      setClaimingNFTList({
        ...claimingNFTList,
        [nft.id]: true
      })
      const newContract = contract.connect(provider.getSigner())
      const tx = await newContract.claimGamblingNFT(ethers.BigNumber.from(id), ethers.BigNumber.from(index))
      console.log("tx", tx);
      const receipt = await tx.wait();
      console.log("receipt", receipt);
    } catch (err) {
      console.log('claimOneNFT', err)
    } finally {
      setClaimingNFTList({
        ...claimingNFTList,
        [nft.id]: false
      })
    }
  }

  const claimETH = async () => {
    try {
      if (gameStatus !== 'ended' && gameStatus !== 'Finshed') {
        toast('游戏结束后可以提币')
        return
      }

      setLoadingState({
        ...loadingState,
        claimETH: true
      })
      const newContract = contract.connect(provider.getSigner())
      const tx = await newContract.claimGamblingETH(id)
  
      console.log("tx", tx);
  
      const receipt = await tx.wait();
      console.log("receipt", receipt);
    } catch (err) {
      console.log('claimETH', err)
    } finally {
      setLoadingState({
        ...loadingState,
        claimETH: false
      })
    }
  }

  const isOwner = useMemo(() => {
    return id && account && game && account === game.record.creator
  }, [id, account, game])

  const isWinner = useMemo(() => {
    return game && game.record.winner === account
  }, [game, account])

  const gameStatus = useMemo(() => {
    if (!game) {
      return ''
    }

    const isOpeninig = parseFloat(game.record.VRFRequestId.toString()) !== 0
    const noWinner = game.record.winner === '0x0000000000000000000000000000000000000000'
    // 已经开奖
    if (!noWinner) {
      return 'Finshed'
    }
    // 正在开奖
    if (isOpeninig) {
      return 'openning'
    }

    // 以下所有状态都是未开奖

    // 还没开始
    if (Date.now() < config.fundraisingStartTime) {
      return 'waiting'
    }
    // 时间到了
    if (Date.now() > config.deadline) {
      return 'ended'
    }
    // 正在集资
    if (config.deadline > Date.now()) {
      return 'open'
    }

    return ''
  }, [game, config])

  const canAppendNFT = useMemo(() => {
    return isOwner && gameStatus && gameStatus !== 'ended' && gameStatus !== 'Finshed'
  }, [isOwner, gameStatus])

  const gamePlayable = useMemo(() => {
    return gameStatus === 'open' && config.fundraisingAmount >= config.minFundraisingAmount
  }, [gameStatus, config])

  const gameJoinable = useMemo(() => {
    return !!selected.length && gameStatus === 'open'
  }, [gameStatus, selected])

  const canClaimAllNFT = useMemo(() => {
    return game && selected.filter(_ => !_.tombstone).length > 1
  }, [game, selected])

  const canClaimETH = useMemo(() => {
    return myBid > 0
    // return myBid > 0 || account === game?.record.creator
  }, [myBid, game, account])

  const minOffer = useMemo(() => {
    if (!config) {
      return 0
    }

    return Math.min(...[
      parseFloat(config?.minCounterpartyBid),
      config?.maxFundraisingAmount - config?.fundraisingAmount
    ])
  }, [config])

  const maxOffer = useMemo(() => {
    if (!config) {
      return 0
    }

    // if (parseFloat(config?.maxCounterpartyBid)) {
    //   return Math.min(...[
    //     parseFloat(config?.maxCounterpartyBid),
    //     config?.maxFundraisingAmount - config?.fundraisingAmount
    //   ])
    // }

    // return Math.min(...[
    //   config?.minFundraisingAmount - config?.fundraisingAmount
    // ])

    if (parseFloat(config?.maxCounterpartyBid)) {
      return Math.min(...[
        parseFloat(config?.maxCounterpartyBid),
        config?.maxFundraisingAmount
      ])
    }

    return Math.min(...[
      config?.minFundraisingAmount
    ])
  }, [config])

  useEffect(() => {
    if (!gameStatus || gameStatus === 'waiting') {
      return
    }
  }, [gameStatus])

  useEffect(() => {
    getGame()
    getMyBid()
  }, [provider, account, id])

  useEffect(() => {
    setLoadingState({
      ...loadingState,
      init: !id || !provider || !account || !game
    })
  }, [provider, account, id, game])

  useEffect(() => {
    if (from === 'create' && isOwner) {
      setShowSelect(true)
    }
  }, [from, isOwner])

  if (loadingState.init) {
    return <div className='game-container-loading'>
      loading
    </div>
  }
  
  return <>
    <div className='game-container'>
      <div className='game-left'>
        <NFTBox
          collection={game.collections}
          onLoad={(nfts) => setSelected(nfts)}
          onChange={(index) => setIndex(index)}
        ></NFTBox>
        {
          selected.length !== 0 && <>
            <div className='panel-wrap'>
              <div className='panel-name'>
                <div className='panel-name-left'>
                  <Image width='16' height='12' src='/img/usage/list.png'></Image>
                  <span>&nbsp;&nbsp;NFT Information</span>
                </div>
                <div className='panel-name-right'>
                  <a>
                    <Image width='20' height='20' src='/img/usage/opensea.png'></Image>
                  </a>
                </div>
              </div>
              <div className='panel-body'>
                <div className='panel-form'>
                  <div>
                    <div className='panel-label'>
                      Blockchain
                    </div>
                    <div className='panel-value'>
                      Ethereum
                    </div>
                  </div>
                  <div>
                    <div className='panel-label'>
                      Contract Address
                    </div>
                    <div className='panel-value'>
                      {convertAddress(selected[index]?.contract?.address)}
                    </div>
                  </div>
                  <div>
                    <div className='panel-label'>
                      Token Standard
                    </div>
                    <div className='panel-value'>
                      {selected[index]?.tokenType}
                    </div>
                  </div>
                  <div>
                    <div className='panel-label'>
                      Token ID
                    </div>
                    <div className='panel-value'>
                      {selected[index]?.tokenId}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        }
      </div>
      <div className='game-right'>
        <div className='game-label'>
          <div className='game-label-name'>
            <div className='game-label-name-left'>
              {selected[index]?.rawMetadata?.name}
            </div>
            {
              gameStatus && <div className={classnames(['game-label-name-right', gameStatus])}>
                <span>{gameStatus}</span>
              </div>
            }
          </div>
          <div className='game-label-progress'>
            <Progress.Line
              status={gameStatus === 'ended' ? 'fail' : gameStatus === 'open' && config.maxFundraisingAmount > config.fundraisingAmount ? 'active' : 'success'}
              percent={config?.fundraisingAmount / config?.minFundraisingAmount * 100}
              // showInfo={false}
              strokeWidth={20}
            />
          </div>
          <div className='game-label-meta'>
            <div className='game-label-meta-item'>
              <div className='game-label-meta-item-key'>
                <span>Random Mode</span>
                &nbsp;
                <Image width='13' height='13' src='/img/usage/faq.png'></Image>
              </div>
              <div className='game-label-meta-item-val'>
                {config?.chainRandomMode ? 'OnChain' : 'VRF'}
              </div>
            </div>
            <div className='game-label-meta-item'>
              <div className='game-label-meta-item-key'>
                <span>Win Rate</span>
                &nbsp;
                <Image width='13' height='13' src='/img/usage/faq.png'></Image>
              </div>
              <div className='game-label-meta-item-val'>
                {config?.creatorWinProbability / 100}%
              </div>
            </div>
            <div className='game-label-meta-item'>
              <div className='game-label-meta-item-key'>
                <span>Floor Price</span>
                &nbsp;
                <Image width='13' height='13' src='/img/usage/faq.png'></Image>
              </div>
              <div className='game-label-meta-item-val'>
                <Image width='15' height='16' src='/img/usage/eth.png'></Image>
                <span className='color-text'>{config?.minCounterpartyBid}</span>
              </div>
            </div>
            <div className='game-label-meta-item'>
              <div className='game-label-meta-item-key'>
                <span>Total Price</span>
                &nbsp;
                <Image width='13' height='13' src='/img/usage/faq.png'></Image>
              </div>
              <div className='game-label-meta-item-val'>
                <Image width='15' height='16' src='/img/usage/eth.png'></Image>
                <span className='color-text'>{config?.minFundraisingAmount}</span>
              </div>
            </div>
            <div className='game-label-meta-item'>
              <div className='game-label-meta-item-key'>
                <span>Deadline</span>
                &nbsp;
                <Image width='13' height='13' src='/img/usage/faq.png'></Image>
              </div>
              <div className='game-label-meta-item-val'>
                {new Date(config?.deadline).toLocaleString()}
              </div>
            </div>
          </div>
          <div className='game-label-footer'>
            <div className='game-label-footer-creator'>
              <Image width='18' height='18' src='/img/usage/user.png'></Image>
              &nbsp;
              <span>{convertAddress(game?.record?.creator)}</span>
            </div>
            <div className='game-label-footer-submit'>
              {
                gameStatus === 'Finshed' ? <>
                {
                  isWinner
                    ? <button className='linear-btn' onClick={() => claimAllNFT()}>
                      <Image width='24' height='24' src='/img/usage/loc.svg'></Image>
                      <span>Claim All NFTs</span>
                    </button>
                    : <>
                    {
                      canClaimETH
                      ? <button className='linear-btn' onClick={() => claimETH()}>
                          <Image width='24' height='24' src='/img/usage/loc.svg'></Image>
                          <span>Claim My ETH</span>
                        </button>
                      : <button className='gray-btn'>
                          <Image width='24' height='24' src='/img/usage/time.svg'></Image>
                          <span>&nbsp;Participate in the next round</span>
                        </button>
                    }
                    </>
                }
                </> : <>
                  {
                    gameStatus === 'ended' ? <>
                    {
                      isOwner
                      ? <button className='linear-btn' onClick={() => claimAllNFT()}>
                          <Image width='24' height='24' src='/img/usage/loc.svg'></Image>
                          <span>Claim All NFTs</span>
                        </button>
                      : <>
                        {
                          canClaimETH
                          ? <button className='linear-btn' onClick={() => claimETH()}>
                              <Image width='24' height='24' src='/img/usage/loc.svg'></Image>
                              <span>Claim My ETH</span>
                            </button>
                          : <button className='gray-btn'>
                              <Image width='24' height='24' src='/img/usage/time.svg'></Image>
                              <span>Sale Has Ended</span>
                            </button>
                        }
                      </>
                    }
                    </> : <>
                    {
                      gameStatus === 'isOpeninig' ? <>
                        <button className='gray-btn'>
                          <Image width='24' height='24' src='/img/usage/time.svg'></Image>
                          <span>Await VRF callback...</span>
                        </button>
                      </> : <>
                        {
                          gameStatus === 'waiting' ? <>
                          {
                            isOwner
                            ? <button className='linear-btn' onClick={() => startAppendNFT()}>
                                <Image width='24' height='24' src='/img/usage/loc.svg'></Image>
                                <span>Choose NFT</span>
                              </button>
                            : <button className='gray-btn'>
                              <Image width='24' height='24' src='/img/usage/time.svg'></Image>
                              <span>{'Start time: ' + new Date(config?.fundraisingStartTime).toLocaleString()}</span>
                            </button>
                          }
                          </> : <div className='footer-control'>
                          {
                            gameStatus === 'open' ? <>
                            {
                              gamePlayable && <button className='linear-btn' onClick={() => playGame()}>
                                <Image width='24' height='24' src='/img/usage/loc.svg'></Image>
                                <span>Make deal</span>
                              </button>
                            }
                            {
                              isOwner
                              ? <>
                              {
                                config.fundraisingAmount < config.maxFundraisingAmount && <>
                                  <button className='linear-btn' onClick={() => startAppendNFT()}>
                                    <Image width='24' height='24' src='/img/usage/loc.svg'></Image>
                                    <span>Choose NFT</span>
                                  </button>
                                </>
                              }
                              </>
                              : <>
                              {
                                selected.length === 0 ? <>
                                  <button className='gray-btn'>
                                    <Image width='24' height='24' src='/img/usage/time.svg'></Image>
                                    <span>waiting...</span>
                                  </button>
                                </> : <>
                                {
                                  config.maxFundraisingAmount >= config.fundraisingAmount
                                    ? <>
                                    </>
                                    : <>
                                        <InputNumber
                                          size='lg'
                                          postfix="ETH"
                                          min={minOffer}
                                          max={maxOffer}
                                          defaultValue={config?.minCounterpartyBid}
                                          onChange={setValue}
                                        />
                                        <button className='linear-btn' onClick={() => joinGame()}>
                                          <Image width='24' height='24' src='/img/usage/loc.svg'></Image>
                                          <span>Make offer</span>
                                        </button>
                                      </>
                                }
                                </>
                              }
                              </>
                            }
                            </> : <button className='gray-btn'>
                              <Image width='24' height='24' src='/img/usage/time.svg'></Image>
                              <span>loading...</span>
                            </button>
                          }
                          </div>
                        }
                      </>
                    }
                    </>
                  }
                </>
              }
            </div>
          </div>
        </div>

        {
          gameStatus === 'Finshed' && <>
            <div className='game-result panel-wrap'>
              <div className='panel-name'>
                <div className='panel-name-left'>
                  <Image width='24' height='24' src='/img/usage/winner.svg'></Image>
                  <span>&nbsp;Winning information</span>
                </div>
                <div className='panel-name-right'>
                  <span>Data check</span>
                  <Image width='12' height='12' src='/img/usage/arrow-right.svg'></Image>
                </div>
              </div>
              <div className='panel-body'>
                <div className='panel-form'>
                  <div>
                    <div className='panel-label'>Winner</div>
                    <div className='panel-value'>{convertAddress(game?.record?.winner)}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        }

        {
          gameStatus && gameStatus !== 'waiting' && Number(game?.counterpartyCount.toString()) !== 0 && <>
            <div className='game-user panel-wrap'>
              <div className='panel-name'>
                <div className='panel-name-left'>
                  <Image width='24' height='24' src='/img/usage/user-2.svg'></Image>
                  <span>&nbsp;Participated records</span>
                </div>
                <div className='panel-name-right'>
                  <span>All ({game?.counterpartyCount.toString()})</span>
                  <Image width='12' height='12' src='/img/usage/arrow-right.svg'></Image>
                </div>
              </div>
              <div className='game-user-list panel-body'>
                <FlowList
                  func={getUsers}
                  mainSlot={(({ result }) => {
                    return result.map((item) => {
                      return <div className='user-item' key={item.address}>
                        <div className='left'>
                          <div className='avatar'></div>
                          <span>{convertAddress(item.address)}</span>
                        </div>
                        <div className='right'>
                          <Image width='15' height='16' src='/img/usage/eth.png'></Image>
                          <span>{item.amount}</span>
                        </div>
                      </div>
                    })
                  })}
                  firstloadingSlot={() => {
                    return <>
                      first loading
                    </>
                  }}
                  nothingSlot={() => {
                    return <>
                      nothing
                    </>
                  }}
                  firstErrorSlot={() => {
                    return <>
                      first error
                    </>
                  }}
                  loadingSlot={() => {}}
                  errorSlot={() => {}}
                >
                </FlowList>
              </div>
            </div>
          </>
        }
      </div>
    </div>
    <SelectNFTModal selectedNFT={selected} id={id} account={account} display={showSelect} onClose={() => setShowSelect(false)}></SelectNFTModal>
  </>
}

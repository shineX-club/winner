import { ethers } from 'ethers'
import contractABI from '../NFTGambling.json'

export const CONTRACT_ADDRESS = '0x7D7EB29F81cAfc32230e59635702cff534497375'

export const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  contractABI
)

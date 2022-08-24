import { ethers } from 'ethers'
import contractABI from '../NFTGambling.json'

export const CONTRACT_ADDRESS = '0x1D8e9F614c058D9615b5375D67B155aEDbf5C5d2'

export const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  contractABI
)

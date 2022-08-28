import { ethers } from 'ethers'
import contractABI from '../NFTGambling.json'

export const CONTRACT_ADDRESS = '0xc3721aaB248726C4E855bEB29180D498D83C4383'

export const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  contractABI
)

export default function NFTBox({ item }) {
  return <div className='nft-box'>
    <img className='nft-img' src={item.image_url} />
  </div>
}

import { NextResponse } from 'next/server'

// Free CoinGecko API — no key required
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  USDC: 'usd-coin',
  USDT: 'tether',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOGE: 'dogecoin',
  MATIC: 'matic-network',
  DOT: 'polkadot',
  LINK: 'chainlink',
  UNI: 'uniswap',
  LTC: 'litecoin',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbols = searchParams.get('symbols')?.split(',') ?? []

  if (symbols.length === 0) return NextResponse.json({})

  const ids = symbols
    .map(s => COINGECKO_IDS[s.toUpperCase()])
    .filter(Boolean)
    .join(',')

  if (!ids) return NextResponse.json({})

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { next: { revalidate: 60 } } // cache for 60s
    )
    const data = await res.json()

    // Map back to symbols
    const result: Record<string, number> = {}
    for (const sym of symbols) {
      const id = COINGECKO_IDS[sym.toUpperCase()]
      if (id && data[id]) {
        result[sym.toUpperCase()] = data[id].usd
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('CoinGecko error:', err)
    return NextResponse.json({})
  }
}

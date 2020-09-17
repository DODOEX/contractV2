function calculateSlippage(buyPercentage: number) {
  const k = 0.1
  console.log(buyPercentage, ":", ((1 / (1 - buyPercentage)) * k - k) * 100, "%")
}

function calculateLoss(priceGap: number) {
  const feeRate = 0.0025
  const k = 0.1
  let amountPartial = Math.sqrt(priceGap / k + 1) - 1
  let loss = amountPartial * (priceGap - feeRate * 2)
  console.log(priceGap, ":", loss * 100, "%")
}

// calculateSlippage(0.01)
// calculateSlippage(0.05)
// calculateSlippage(0.1)
// calculateSlippage(0.2)
// calculateSlippage(0.5)
// calculateSlippage(0.7)

// calculateLoss(0.006)
// calculateLoss(0.007)
// calculateLoss(0.008)
// calculateLoss(0.009)
// calculateLoss(0.01)
// calculateLoss(0.02)
// calculateLoss(0.03)
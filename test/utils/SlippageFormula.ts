function calculateSlippage(buyPercentage: number) {
  const k = 0.1
  console.log(buyPercentage, ":", ((1 / (1 - buyPercentage)) * k - k) * 100, "%")
}

// calculateSlippage(0.01)
// calculateSlippage(0.05)
// calculateSlippage(0.1)
// calculateSlippage(0.2)
// calculateSlippage(0.5)
// calculateSlippage(0.7)

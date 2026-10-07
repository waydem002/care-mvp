import { getInsuranceRates } from "@/lib/queries";
import InsuranceCalculator from "@/components/InsuranceCalculator";
import InsuranceRatesEditor from "@/components/InsuranceRatesEditor";

export default async function InsuranceCalculatorPage() {
  const rates = await getInsuranceRates();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-ink">Insurance calculator</h1>
      <p className="mb-6 text-sm text-muted">Estimate what care insurance covers vs. what the client pays, by Pflegegrad.</p>

      <div className="mb-6">
        <InsuranceCalculator rates={rates} />
      </div>

      <InsuranceRatesEditor rates={rates} />
    </div>
  );
}

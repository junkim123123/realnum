# Category Knowledge Library

## Overview

The Category Knowledge Library is a reusable data structure that stores manually researched compliance rules and factory vetting hints for different product categories. During alpha, these are maintained as versioned JSON files. Eventually, they may be moved to a database or admin UI.

## Purpose

This library enables the app to:

1. **Compliance Hints**: Automatically surface relevant customs and compliance requirements (e.g., CPSIA, FDA, UL) based on the product category
2. **Factory Vetting Hints**: Provide guidance on what to look for when vetting factories (e.g., required certificates, red flags, sample questions)

## File Structure

### Compliance Rules

- **Location**: `web/data/compliance/category_rules.json`
- **Sample File**: `web/data/compliance/category_rules.sample.json`
- **TypeScript Types**: `web/lib/types/compliance.ts`
- **Helper Functions**: `web/lib/compliance.ts`

### Factory Vetting Hints

- **Location**: `web/data/factory/category_vetting.json`
- **Sample File**: `web/data/factory/category_vetting.sample.json`
- **TypeScript Types**: `web/lib/types/factoryVetting.ts`
- **Helper Functions**: `web/lib/factoryVetting.ts`

## How It Works

1. When a product is analyzed, the system extracts:
   - Product name
   - HTS code (from AI analysis)

2. The system attempts to match these to a category using:
   - HTS code lookup (primary method)
   - Product name keyword matching (fallback)

3. If a match is found, the analysis result includes:
   - `compliance_hints`: Category-specific compliance rules
   - `factory_vetting_hints`: Category-specific factory vetting guidance

4. If no match is found, these fields are undefined (no hints provided)

## Adding a New Category

### Option 1: Fully Automated Pipeline (Recommended - Gemini Only)

Use the fully automated script to research, verify, generate, and merge category knowledge:

```bash
pnpm tsx scripts/autoCategory.ts "US baby teether toy (silicone)"
pnpm tsx scripts/autoCategory.ts "stainless steel water bottle"
```

This script performs **all steps automatically**:

1. **Input Parsing**: Derives category ID, label, example products, and probable HTS codes
2. **Research Phase**: Uses Gemini 2.5 Pro to research:
   - Regulations & Compliance (CPSIA, ASTM, FDA, etc.)
   - Required Testing (specific standards and requirements)
   - Factory Vetting (certificates, questions, red flags)
3. **Verification Phase**: Self-checks research data to:
   - Verify regulation numbers and CFR parts
   - Validate HTS codes
   - Fact-check testing requirements
   - Verify reference links (.gov/.org only)
   - Remove hallucinations
4. **JSON Generation**: Builds both compliance and factory vetting JSON objects
5. **Auto-Merge**: Automatically updates or creates entries in:
   - `web/data/compliance/category_rules.json`
   - `web/data/factory/category_vetting.json`
6. **Git Commit**: Automatically commits changes with a descriptive message

**What You Get:**
- Comprehensive research data
- Verified and fact-checked information
- Both compliance and factory vetting hints
- Files automatically updated
- Git commit created

**Important**: The script uses Gemini's self-verification to reduce hallucinations, but you should still review critical compliance information before production use.

### Option 2: AI-Generated First Draft (Manual Merge Required)

Use the simpler script to generate a first draft using Gemini 2.5 Pro:

```bash
npx tsx scripts/generateCategoryKnowledge.ts "baby teether"
npx tsx scripts/generateCategoryKnowledge.ts "stainless steel water bottle"
```

The script will:
1. Generate both compliance rules and factory vetting hints
2. Output formatted JSON to the console
3. Ensure IDs match between compliance and factory data

**You must manually:**
- Copy the JSON output
- Add it to the respective JSON files
- Commit the changes

**Important**: Review and fact-check the AI-generated content before using it. Treat it as a starting point, not a final version.

### Option 2: Manual Research

### Step 1: Research the Category

Use external tools (Perplexity, GPT, official government sites) to research:

**For Compliance Rules:**
- Required regulations (CPSIA, FDA, UL, etc.)
- Testing requirements
- High-risk flags
- Typical HTS codes
- Target markets where these rules apply

**For Factory Vetting:**
- Typical supplier types (OEM, ODM, etc.)
- Must-have certificates
- Nice-to-have certificates
- Sample questions to ask factories
- Common red flags
- Recommended Alibaba filters

### Step 2: Create the JSON Entry

**Note**: If you used Option 1 (AI script), you can skip to Step 3 and paste the generated JSON directly.

1. Copy the sample file structure from `category_rules.sample.json` or `category_vetting.sample.json`
2. Fill in all fields for your category
3. Use a clear, descriptive `id` (e.g., `baby_teether`, `stainless_steel_tumbler`)
4. Ensure all arrays have at least 2-3 items

### Step 3: Add to the JSON File

1. If this is your first entry, copy the sample file:
   ```bash
   cp web/data/compliance/category_rules.sample.json web/data/compliance/category_rules.json
   cp web/data/factory/category_vetting.sample.json web/data/factory/category_vetting.json
   ```

2. Add your new category entry to the `categories` array in the appropriate file
3. Keep the JSON file valid (check syntax)

### Step 4: Test

1. Restart the dev server
2. Analyze a product that should match your new category
3. Check the API response - it should include `compliance_hints` and/or `factory_vetting_hints`
4. Verify the data matches what you entered

## Field Descriptions

### Compliance Rules (`CategoryComplianceRule`)

- **`id`**: Unique identifier (e.g., `"baby_teether"`)
- **`label`**: Human-readable name (e.g., `"Baby Teether / Infant Teething Toys"`)
- **`exampleProducts`**: Array of example product names that match this category
- **`targetMarkets`**: Array of target markets where these rules apply (e.g., `["United States", "European Union"]`)
- **`typicalHtsCodes`**: Array of typical HTS/HS codes for this category (e.g., `["9503.00.00", "3924.10.00"]`)
- **`requiredRegulations`**: Array of required regulations (e.g., `["CPSIA", "FDA", "UL"]`)
- **`testingRequirements`**: Array of short bullet texts describing testing requirements
- **`highRiskFlags`**: Array of high-risk flags to watch out for
- **`referenceLinks`**: Array of URLs to official documentation

### Factory Vetting Hints (`CategoryFactoryVettingHints`)

- **`id`**: Unique identifier (must match the compliance rule `id` if both exist)
- **`label`**: Human-readable name (should match the compliance rule label)
- **`typicalSupplierTypes`**: Array of typical supplier types (e.g., `["OEM", "ODM"]`)
- **`mustHaveCertificates`**: Array of must-have certificates (e.g., `["ISO 9001", "BSCI"]`)
- **`niceToHaveCertificates`**: Array of nice-to-have certificates
- **`sampleQuestionsToFactory`**: Array of example questions buyers should ask factories
- **`commonRedFlags`**: Array of common red flags to watch out for
- **`recommendedAlibabaFilters`**: Array of recommended filters for Alibaba searches

## Best Practices

1. **Research Quality**: Use authoritative sources (government websites, official standards bodies)
2. **Completeness**: Fill in all fields - empty arrays are allowed but less helpful
3. **Specificity**: Be specific with examples and requirements
4. **Consistency**: Use consistent formatting and terminology
5. **Updates**: Keep entries up-to-date as regulations change

## Integration Points

The category knowledge library is automatically integrated into:

- `/api/analyze-product` - Analysis results include hints if a category match is found
- Analysis result type (`ProductAnalysis`) includes optional `compliance_hints` and `factory_vetting_hints`

---

## Regulation Reasoning + Testing Cost Estimation Engine

### How It Works

When a product analysis successfully matches a compliance category, the system now automatically enriches the result with two additional data points:

1.  **Regulation Reasoning**: The system calls `generateRegulationReasoning()` which uses Gemini 2.5 Pro to explain *why* each of the `requiredRegulations` applies to the product. It references legal definitions from sources like CPSIA, CPSC, and the FDA to provide context.
2.  **Testing Cost Estimation**: The system calls `estimateTestingCost()` which maps the `requiredRegulations` to a predefined table of common lab tests. It returns a low and high cost estimate for each required test.

This process happens in the `/api/analyze-product` route immediately after the compliance hints are retrieved.

### Example Output

If a "baby teether" is analyzed, the `ProductAnalysis` object will now include:

```json
{
  "regulation_reasoning": [
    {
      "regulation": "CPSIA",
      "reason": "The Consumer Product Safety Improvement Act (CPSIA) applies to all children's products... for children 12 years of age or younger."
    },
    {
      "regulation": "ASTM F963",
      "reason": "ASTM F963 is a mandatory safety standard for toys in the US, referenced by CPSIA..."
    }
  ],
  "testing_cost_estimate": [
    { "test": "CPSIA Lead Content", "low": 150, "high": 250 },
    { "test": "CPSIA Phthalates", "low": 300, "high": 450 },
    { "test": "ASTM F963 Mechanical Hazards", "low": 180, "high": 320 }
  ]
}
```

### How Costs Are Calculated

-   Costs are based on a static lookup table in `web/lib/regulation/testCost.ts`.
-   The table (`testingCostTable`) contains low/high estimates for common tests associated with regulations like CPSIA, ASTM, and FDA.
-   These are estimates and can vary based on the lab, product complexity, and materials.
-   The system maps regulations (e.g., `cpsia`) to a list of required tests (e.g., `['CPSIA Lead Content', 'CPSIA Phthalates']`).
-   The final estimate is a collection of all tests required by the matched compliance rule.

## Usage Logging & Category Popularity

The system automatically logs category usage for analytics and auto-reinforcement. Each product analysis request is logged with relevant metadata.

### Usage Log Format

Each analysis request creates a log entry in NDJSON format (newline-delimited JSON) at:

- **Location**: `logs/category-usage.ndjson`

Each line contains a `CategoryUsageEvent` with:
- `timestamp`: ISO8601 timestamp
- `raw_input`: Original user input
- `product_name`: Identified product name from analysis
- `hts_code`: Estimated HTS code
- `category_id`: Matched category ID (if found)
- `market`: Target market (if available)
- `regulation_tags`: Extracted regulation identifiers (e.g., ["CPSIA", "FDA", "UL"])
- `risk_score`: Overall risk score from analysis
- `feasibility_score`: Confidence score (if available)

### Category Popularity Ranking

Generate popularity rankings from usage logs:

```bash
pnpm generate:category-popularity
```

This script:
1. Reads all events from `logs/category-usage.ndjson`
2. Aggregates usage counts per category
3. Calculates statistics (average risk scores, top regulations, etc.)
4. Generates a ranked list sorted by usage count

Output file: `web/data/analytics/category_popularity.json`

The ranking includes:
- Total usage count per category
- First and last seen timestamps
- Average risk and feasibility scores
- Top 5 regulation tags
- Human-readable labels from compliance rules

**Regenerating the Ranking**: Run the script periodically (e.g., weekly) to update rankings based on latest usage data.

## Top-N Category Auto-Reinforcement

Automatically refresh compliance and factory vetting data for the most popular categories using the autoCategory pipeline.

### How It Works

The reinforcement engine:

1. **Reads Popularity Ranking**: Loads `web/data/analytics/category_popularity.json`
2. **Selects Top N**: Takes the most popular categories (default: 50)
3. **Runs AutoCategory Pipeline**: For each category, calls `autoCategory.ts` to:
   - Re-research compliance rules with latest Gemini knowledge
   - Verify and update regulations
   - Enhance factory vetting hints
   - Merge updates into JSON files
4. **Concurrency Control**: Processes 2 categories in parallel with 500ms delays to respect API limits
5. **Retry Logic**: Automatically retries failed categories up to 2 times
6. **Logging**: Detailed logs saved to `logs/category-reinforce.log`

### Usage

```bash
# Reinforce top 50 categories (default)
pnpm reinforce:top-categories

# Reinforce top 10 categories
pnpm reinforce:top-categories 10

# Reinforce top 100 categories
pnpm reinforce:top-categories 100
```

### When to Run

- **Weekly**: After generating new popularity rankings
- **After Major Regulation Changes**: When new compliance rules are announced
- **Before Big Releases**: To ensure popular categories have latest data

**Note**: This process can take 30-60 minutes depending on the number of categories, as it makes multiple Gemini API calls. Monitor the log file for progress.

## Regulation Pattern Analytics

Discover frequent regulation combinations and risk clusters across categories to power smarter hints and dashboards.

### How It Works

The pattern extraction model analyzes:

1. **Compliance Rules**: All categories in `category_rules.json`
   - Extracts regulation identifiers from `requiredRegulations`
   - Analyzes `testingRequirements` and `highRiskFlags`
   
2. **Usage Logs**: Real-world usage data from `category-usage.ndjson`
   - Tracks which regulations appear together
   - Calculates average risk scores per regulation combination
   - Identifies common HTS code patterns

3. **Pattern Discovery**:
   - **Regulation Combinations**: Groups categories that share the same set of regulations (e.g., CPSIA + EN71)
   - **HTS Prefix Patterns**: Groups categories by HTS code prefixes and their dominant regulations
   - **Frequency Analysis**: Only includes patterns that appear in multiple categories (minimum threshold)

### Usage

```bash
pnpm generate:regulation-patterns
```

### Output Structure

Output file: `web/data/analytics/regulation_patterns.json`

```json
{
  "generated_at": "2025-12-03T...",
  "pattern_count": 25,
  "by_regulation_combo": [
    {
      "regulation_combo": ["CPSIA", "EN71"],
      "categories_count": 34,
      "avg_risk_score": 71.2,
      "example_categories": ["us_baby_teether", "wooden_montessori_toy"],
      "common_testing_requirements": ["EN71 Part 1", "CPSIA heavy metals"],
      "common_high_risk_flags": ["choking_hazard", "small_parts"]
    }
  ],
  "by_hts_prefix": [
    {
      "hts_prefix": "9503",
      "categories_count": 50,
      "dominant_regulations": ["CPSIA", "EN71"],
      "avg_risk_score": 69.5,
      "notes": "Toys and children's products frequently require CPSIA + EN71 testing."
    }
  ]
}
```

### Use Cases

This data can be used to:

- **Smart Category Suggestions**: When a user searches for a product, suggest likely regulations based on similar categories
- **Risk Prediction**: Estimate risk scores for new categories based on regulation patterns
- **Dashboard Analytics**: Show regulation trends and common combinations
- **Knowledge Gap Detection**: Identify categories that don't match expected patterns (potential data quality issues)

**Future Integration**: This pattern data can be fed into the analysis API to provide smarter hints even when an exact category match isn't found.

## Future Enhancements

- Move to database for easier editing
- Admin UI for managing categories
- Version history and change tracking
- Multi-language support
- Category hierarchy (parent/child categories)
- Integration of regulation patterns into real-time analysis

---

## Bulk Category Generation

For generating a large number of categories at once, a dedicated bulk generation script is available. This script reads a list of category descriptions from a text file and processes them in parallel.

### How It Works

1.  **Input File**: The script reads category descriptions line-by-line from a specified input file (default: `categories.txt`). It skips empty lines and lines starting with `#`.
2.  **Parallel Processing**: It processes up to 3 categories concurrently to speed up the generation process.
3.  **Programmatic Call**: For each category, it programmatically calls the `autoCategory.ts` script to generate the compliance and factory vetting data.
4.  **JSON Merging**: The generated JSON for each category is automatically merged into the main `category_rules.json` and `category_vetting.json` files. Existing categories are overwritten, and new categories are appended in alphabetical order.
5.  **Error Handling & Retries**: If a category fails to generate, the script will automatically retry up to 3 times. If it still fails, the category name is logged to a `failed.txt` file for later review.
6.  **Git Automation**: After every 5 successful category generations, the script automatically creates a Git commit.
7.  **Logging**: Detailed logs for each run are saved to a timestamped file in the `logs/` directory (e.g., `logs/bulkRun-YYYY-MM-DDTHH-mm-ss-SSSZ.log`).

### Usage

1.  Create a text file (e.g., `categories.txt`) in the `web/` directory and add one product category description per line.
2.  Run the following command from the `web/` directory:

    ```bash
    # Use the default categories.txt file
    pnpm tsx scripts/bulkGenerate.ts

    # Specify a custom input file
    pnpm tsx scripts/bulkGenerate.ts my_categories.txt
    ```

3.  The script will display real-time progress and a final summary upon completion.



---

## Automated Category Knowledge Pipeline (Gemini-only)

The fully automated pipeline (`autoCategory.ts`) is the recommended way to add new categories. It handles everything from research to Git commit automatically.

### How It Works

The pipeline performs these steps in sequence:

1. **Input Handling**: Parses the product description to derive:
   - `category_id` (snake_case slug)
   - `category_label` (human-readable)
   - `exampleProducts` (array of example product names)
   - `probableHtsCodes` (suggested HTS codes via Gemini)
   - `targetMarket` (default: "United States")

2. **Research Pipeline**: Uses Gemini 2.5 Pro to research:
   - **Regulations & Compliance**: CPSIA, ASTM F963, CPSC rules, FDA regulations, tracking labels, recalls
   - **Required Testing**: CPSIA testing, ASTM performance tests, FDA extraction tests, mechanical/chemical tests, age grading
   - **Factory Vetting**: Supplier types, certificates (must-have and nice-to-have), QC processes, red flags, Alibaba filters

3. **Verification (Self-Check)**: Gemini verifies the research:
   - Cross-checks regulation numbers (CFR parts)
   - Validates HTS codes
   - Ensures testing requirements match official standards
   - Verifies reference links (.gov/.org only)
   - Removes hallucinations and generic advice

4. **JSON Generation**: Builds two complete JSON objects:
   - Compliance rules (`CategoryComplianceRule`)
   - Factory vetting hints (`CategoryFactoryVettingHints`)

5. **Auto-Merge Logic**:
   - Reads existing JSON files (creates from sample if missing)
   - Checks if `category_id` already exists
   - **If exists**: Overwrites the entry (update)
   - **If not**: Appends to `categories[]` array (create)
   - Writes formatted JSON with consistent indentation

6. **Git Automation**:
   - Stages both JSON files
   - Commits with message: `"Auto-update category knowledge: {category_id}"`
   - Non-blocking (continues if Git fails)

### Usage Examples

```bash
# Basic usage
pnpm tsx scripts/autoCategory.ts "US baby teether toy (silicone)"

# Other examples
pnpm tsx scripts/autoCategory.ts "stainless steel insulated water bottle"
pnpm tsx scripts/autoCategory.ts "LED desk lamp with USB charging"
pnpm tsx scripts/autoCategory.ts "wireless phone charger (Qi standard)"
```

### Output

After running, you'll see:

```
✅ Category Knowledge Generation Complete
================================================================================
Category ID:       us_baby_teether_silicone
Label:             Silicone Baby Teether Toy
Target Market:     United States

--- Compliance Data ---
Regulations:       9 found
HTS Codes:         9503.00.00, 3924.90.56
Testing Reqs:      6 items
Risk Flags:        4 items
Reference Links:   5 links

--- Factory Vetting Data ---
Supplier Types:    3 types
Must-Have Certs:   4 certificates
Nice-to-Have:      3 certificates
Sample Questions:  7 questions
Red Flags:         6 flags
Alibaba Filters:   4 filters

--- File Status ---
Compliance File:   created → web/data/compliance/category_rules.json
Factory File:      created → web/data/factory/category_vetting.json
```

### Auto-Merge Behavior

- **New Category**: Entry is appended to `categories[]` array
- **Existing Category**: Entry with matching `id` is overwritten
- **Missing Files**: Creates files from sample templates automatically
- **JSON Formatting**: Always writes with 2-space indentation and trailing newline

### Error Handling

- If Gemini API fails, script exits with clear error message
- If JSON files are invalid, script will fail before overwriting
- Git failures are non-blocking (you can commit manually)

---

## 개발용 스크립트로 카테고리 초안 만들기 (수동 병합 필요)

새로운 카테고리 데이터를 추가할 때, 이 개발용 스크립트를 사용하면 Gemini 2.5 Pro를 통해 초안을 빠르게 생성할 수 있습니다. 하지만 결과를 수동으로 JSON 파일에 추가해야 합니다.

### 사용법

프로젝트 루트에서 아래 명령어를 실행하세요. 따옴표 안에 원하는 카테고리에 대한 설명을 자유롭게 입력하면 됩니다.

```bash
npx tsx scripts/generateCategoryKnowledge.ts "US baby teether toy (silicone)"
```

### 결과물 처리

스크립트는 콘솔에 JSON 객체를 출력합니다. 이 객체는 `compliance`와 `factory` 두 개의 키를 가지고 있습니다.

1.  `compliance` 객체의 내용물을 복사하여 `web/data/compliance/category_rules.json` 파일 안의 `categories` 배열에 새로운 항목으로 추가합니다.
2.  `factory` 객체의 내용물을 복사하여 `web/data/factory/category_vetting.json` 파일 안의 `categories` 배열에 새로운 항목으로 추가합니다.

**매우 중요**: 이 스크립트가 생성하는 내용은 AI가 만든 초안이며 법적 자문이 아닙니다. Perplexity나 공식 정부 문서를 통해 반드시 내용을 검증하고 수정하신 후 사용해야 합니다.
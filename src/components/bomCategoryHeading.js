export function shouldShowBomCategoryHeading({ groupMode, row, previousRow, index }) {
  return groupMode === 'typology' && row?.hideCategoryHeading !== true &&
    (index === 0 || row?.category !== previousRow?.category);
}

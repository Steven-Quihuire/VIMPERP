const mobileOrTabletPattern = /android|iphone|ipad|ipod|mobile|tablet/i;

export const isDesktop = (userAgent: string, hasCoarsePointer: boolean) => {
  if (hasCoarsePointer) {
    return false;
  }

  return !mobileOrTabletPattern.test(userAgent);
};

/**
 * Converts an IP address to a consistent numeric ID
 * This ensures the same IP always gets the same ID
 * @param ip - IP address (e.g., "192.168.1.100")
 * @returns Numeric ID based on IP
 */
export const ipToDeviceId = (ip: string): number => {
  // Remove any protocol prefixes and clean the IP
  const cleanIp = ip
    .replace(/^https?:\/\//, "")
    .replace(/:\d+$/, "")
    .trim();

  // Split IP into octets
  const octets = cleanIp.split(".").map((octet) => parseInt(octet, 10));

  // Validate IP format
  if (
    octets.length !== 4 ||
    octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)
  ) {
    // Fallback for invalid IPs: use hash-based approach
    return stringToNumericId(cleanIp);
  }

  // Convert IP to numeric ID: each octet contributes to the final number
  // This creates a unique ID for each valid IP address
  const id =
    octets[0] * 256 * 256 * 256 +
    octets[1] * 256 * 256 +
    octets[2] * 256 +
    octets[3];

  return id;
};

/**
 * Fallback function to convert any string to a consistent numeric ID
 * Used for non-standard IP formats or hostnames
 * @param str - String to convert
 * @returns Numeric ID based on string hash
 */
const stringToNumericId = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Ensure positive number
  return Math.abs(hash);
};

/**
 * Converts a numeric device ID back to IP address
 * @param id - Numeric device ID
 * @returns IP address string
 */
export const deviceIdToIp = (id: number): string | null => {
  // Only works for IDs that were created from valid IP addresses
  const MAX_IPV4_VALUE = 4294967295;
  if (id < 0 || id > MAX_IPV4_VALUE) {
    return null;
  }

  const octet1 = Math.floor(id / (256 * 256 * 256));
  const octet2 = Math.floor((id % (256 * 256 * 256)) / (256 * 256));
  const octet3 = Math.floor((id % (256 * 256)) / 256);
  const octet4 = id % 256;

  // Validate octets are in valid range
  const MAX_OCTET = 255;
  if (
    octet1 > MAX_OCTET ||
    octet2 > MAX_OCTET ||
    octet3 > MAX_OCTET ||
    octet4 > MAX_OCTET
  ) {
    return null;
  }

  return `${octet1}.${octet2}.${octet3}.${octet4}`;
};

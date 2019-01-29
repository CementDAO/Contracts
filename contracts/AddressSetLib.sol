pragma solidity ^0.5.0;


/**
 * @dev A library allowing to put addresses in a set and query it.
 */
library AddressSetLib {
    struct Data {
        mapping(address => bool) flags;
        address[] addresses;
    }

    /**
     * @dev Inserts a value in the set if not already present.
     * Returns true if value wasn't found in the set and added,
     * otherwise false.
     */
    function insert(Data storage self, address value)
        public
        returns (bool)
    {
        // Value already in set?
        if (self.flags[value]) {
            return false;
        }
        self.addresses.push(value);
        self.flags[value] = true;
        return true;
    }

    /**
     * @dev Removes a value from the set if present.
     * Returns true if the value was found and removed,
     * otherwise false.
     */
    function remove(Data storage self, address value)
        public
        returns (bool)
    {
        // Value not in set?
        if (!self.flags[value]) {
            return false;
        }
        self.flags[value] = false;
        return true;
    }

    /**
     * @dev Queries the set for a given value value.
     * Returns true if the set contains the value,
     * otherwise false.
     */
    function contains(Data storage self, address value)
        public view
        returns (bool)
    {
        return self.flags[value];
    }

    /**
     * @dev Returns an address array with the keys
     */
    function getAddresses(Data storage self) 
        public 
        view 
        returns(address[] memory, uint256) 
    {
        uint256 totalAddresses = self.addresses.length;
        uint256 activeIndex = 0;
        address[] memory _activeAddresses = new address[](totalAddresses);
        for (uint256 totalIndex = 0; totalIndex < totalAddresses; totalIndex += 1) {
            if (self.flags[self.addresses[totalIndex]] == true) {
                _activeAddresses[activeIndex] = self.addresses[totalIndex];
                activeIndex += 1; // Unlikely to overflow
            }
        }
        return (_activeAddresses, activeIndex);
    }
}

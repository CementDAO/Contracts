pragma solidity ^0.5.0;


/**
 * @dev A library allowing to put addresses in a set and query it.
 */
library AddressSetLib {
    struct Data {
        mapping(address => bool) flags;
        address[] keys;
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
        self.keys.push(value);
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
    function getKeys(Data storage self) 
        public 
        view 
        returns(address[] memory) 
    {
        uint256 totalKeys = self.keys.length;
        uint256 currentKeys = 0;
        address[] memory _keys;
        for (uint256 key = 0; key < totalKeys; key += 1) {
            if (self.flags[self.keys[key]] == true) {
                _keys[currentKeys] = self.keys[key];
                currentKeys += 1; // Unlikely to overflow
            }
        }
        return _keys;
    }
}

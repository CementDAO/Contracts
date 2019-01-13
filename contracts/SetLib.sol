pragma solidity ^0.5.0;


/**
 * @dev A library allowing to put things in a set and query it.
 */
library SetLib {
    struct Data { mapping(address => bool) flags; }

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
}

const ethUtil = require('ethereumjs-util');
const abi =  require('ethereumjs-abi');

export class SignHelper {

    private typedData = {
        types: {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ],
            Permit: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ]
        },
        primaryType: 'Permit',
    };

    private types = this.typedData.types;

    // Recursively finds all the dependencies of a type
    private dependencies(primaryType, found = []) {
        if (found.includes(primaryType)) {
            return found;
        }
        if (this.types[primaryType] === undefined) {
            return found;
        }
        found.push(primaryType);
        for (let field of this.types[primaryType]) {
            for (let dep of this.dependencies(field.type, found)) {
                if (!found.includes(dep)) {
                    found.push(dep);
                }
            }
        }
        return found;
    }

    private encodeType(primaryType): Buffer {
        // Get dependencies primary first, then alphabetical
        let deps = this.dependencies(primaryType);
        deps = deps.filter(t => t != primaryType);
        deps = [primaryType].concat(deps.sort());

        // Format as a string with fields
        let result = '';
        for (let type of deps) {
            result += `${type}(${this.types[type].map(({ name, type }) => `${type} ${name}`).join(',')})`;
        }
        return Buffer.from(result);
    }

    private typeHash(primaryType) {
        return ethUtil.keccak256(this.encodeType(primaryType));
    }

    private encodeData(primaryType, data):Buffer {
        let encTypes = [];
        let encValues = [];
        // Add typehash
        encTypes.push('bytes32');
        encValues.push(this.typeHash(primaryType));

        // Add field contents
        for (let field of this.types[primaryType]) {
            let value = data[field.name];
            // console.log("type:" + field.type);
            // console.log("value:" + value);
            // encTypes.push(field.type);
            // encValues.push(value);
            if (field.type == 'string' || field.type == 'bytes') {
                encTypes.push('bytes32');
                value = ethUtil.keccak256(Buffer.from(value));
                encValues.push(value);
            } else if (this.types[field.type] !== undefined) {
                encTypes.push('bytes32');
                value = ethUtil.keccak256(this.encodeData(field.type, value));
                encValues.push(value);
            } else if (field.type.lastIndexOf(']') === field.type.length - 1) {
                throw 'TODO: Arrays currently unimplemented in encodeData';
            } else {
                encTypes.push(field.type);
                encValues.push(value);
            }
        }

        return abi.rawEncode(encTypes, encValues);
    }

    private structHash(primaryType, data) {
        return ethUtil.keccak256(this.encodeData(primaryType, data));
    }

    public signHash(domain: string, message: any) {
        var digest = ethUtil.keccak256(
            Buffer.concat([
                Buffer.from('1901', 'hex'),
                Buffer.from(domain),
                // this.structHash('EIP712Domain', domain),
                this.structHash(this.typedData.primaryType, message),
            ]),
        );
        console.log("digest:", "0x" + digest.toString("hex"));
        return digest;
    }
}


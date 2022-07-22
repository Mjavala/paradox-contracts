/* eslint-disable node/no-unpublished-import */
/* eslint-disable node/no-unsupported-features/es-builtins */
/* eslint-disable prettier/prettier */
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs")
const keccak256 = require("keccak256")
const fs = require("fs")
const data = require("../data/snap1.json")
const web3 = require("web3");

const clean = () => {
  let allLines = fs
    .readFileSync("../data/data.log")
    .toString()
    .split("\n");

  fs.writeFileSync("../data/data.log", "", function () {
    console.log("file is empty");
  });
  allLines.forEach(function (line) {
    const newLine = line + ",";
    console.log(newLine);
    fs.appendFileSync("./real.text", newLine.toString() + "\n");
  });

  // each line would have "candy" appended
  allLines = fs
    .readFileSync("../data/real.text")
    .toString()
    .split("\n");
};

const genMTree = (data) => {
  const result = Object.keys(data).map(
    (key) =>
      ethers.utils
        .solidityKeccak256(["address", "uint256"], [key, data[key].toString()])
        .substr(2),
    "hex"
  );

  const tree = new MerkleTree(result, keccak256, { sortPairs: true });

  const root = tree.getHexRoot();
  // verify
  result.forEach((leaf, index) => {
    const proof = tree.getProof(leaf);
    if (!tree.verify(proof, leaf, root)) console.log(leaf);
  });

  return [root, tree];
};

const format = (amount, dec) => {
  return Number(Number(ethers.utils.formatUnits(amount, dec)).toFixed(6));
};

const parse = (amount, dec) => {
  return ethers.utils.parseUnits(amount, dec);
};

// get a random key from our address: amount pairs
const randomAddress = (obj) => {
  var keys = Object.keys(obj);
  const r = (keys.length * Math.random()) << 0;
  const key = keys[(keys.length * Math.random()) << 0];
  const amount = obj[key].toString();
  const leaf = Buffer.from(
    ethers.utils
      .solidityKeccak256(["address", "uint256"], [key, amount])
      .substr(2),
    "hex"
  );
  return { leaf, address: String(key), amount };
};

const getProof = (tree) => {
  [root, tree] = genMTree(data)
  let address = "0x66eCa275200015DCD0C2Eaa6E48d4eED3092cDD6"
  let amount = "16684264050853300000"
  let leaf = Buffer.from(
    ethers.utils
      .solidityKeccak256(["address", "uint256"], [address , amount])
      .substr(2),
    "hex"
  );
  const proof = tree.getHexProof(leaf);
  const arr = []
  proof.forEach(proof => {
    zeroproof = String(proof).padEnd(64);
    arr.push(zeroproof)
  })

  console.log(arr)
}

const [root,tree ] = genMTree(data)
console.log(root)

module.exports = {
  clean,
  genMTree,
  parse,
  format,
  randomAddress,
  getProof
}

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs')
const data = require("../data/snap1.json");
const data2 = require("../data/snap2.json");
const data3 = require("../data/snap3.json");

const { format, parse, randomAddress, genMTree, getProof } = require("../utils");


describe("Presale", async () => {
    let deployer, addrs, tree, root, paradox, usdt, presale, alice, bob;

    beforeEach(async () => {
        // get trx signers
		[deployer, ...addrs] = await ethers.getSigners();

        alice = addrs[1];
        bob = addrs[2];

        [root, tree] = genMTree(data)

        paradox = await ethers.getContractFactory("Paradox")
        paradox = await paradox.deploy()

        usdt = await ethers.getContractFactory("USDT")
        usdt = await usdt.deploy()

        presale = await ethers.getContractFactory("NFTPresale")
        presale = await presale.deploy(usdt.address, paradox.address, root)

        await paradox.transfer(presale.address, parse('12500000', 18))
	});

    it ("Alice vest 500 usdt, claim paradox, claim vested paradox after a month", async () => {
      const address = Object.keys(data)[Object.keys(data).length - 1];
      const amount = data[address].toString();
      const leaf = Buffer.from(
        ethers.utils
          .solidityKeccak256(["address", "uint256"], [address, amount])
          .substr(2),
        "hex"
      );
      const proof = tree.getHexProof(leaf);

      expect(await presale.canClaim(address, amount, proof)).to.equal(true);

      await usdt.transfer(address, parse(Number(amount * 500).toString(), 6))
      await usdt.connect(alice).approve(presale.address, parse(Number(amount * 500).toString()))

      await presale.connect(alice).claimParadox(address, amount, parse(Number(500 * amount).toString(), 6), proof)

      expect(await format(await paradox.balanceOf(address), 18).toFixed(0)).to.equal('625')
      expect(await presale.canClaim(address, amount, proof)).to.equal(false);

      await expect(presale.connect(alice).claimParadox(address, amount, parse(Number(500 * amount).toString(), 6), proof)).to.be.revertedWith("Invalid Claim")
    });
    it("Claims half an then half again", async () => {
      const address = Object.keys(data)[Object.keys(data).length - 1];
      const amount = data[address].toString();
      const leaf = Buffer.from(
        ethers.utils
          .solidityKeccak256(["address", "uint256"], [address, amount])
          .substr(2),
        "hex"
      );
      const proof = tree.getHexProof(leaf);

      expect(await presale.canClaim(address, amount, proof)).to.equal(true);

      await usdt.transfer(address, parse(Number(amount * 500).toString(), 6))
      await usdt.connect(alice).approve(presale.address, parse(Number(amount * 500).toString()))

      await presale.connect(alice).claimParadox(address, amount, parse(Number(250 * amount).toString(), 6), proof)
      expect(await format(await paradox.balanceOf(address), 18).toFixed(0)).to.equal('313')
      expect(await presale.canClaim(address, amount, proof)).to.equal(true);

      await presale.connect(alice).claimParadox(address, amount, parse(Number(250 * amount).toString(), 6), proof)
      expect(await format(await paradox.balanceOf(address), 18).toFixed(0)).to.equal('625')
      expect(await presale.canClaim(address, amount, proof)).to.equal(false);
    })
    it("Claims and a new merkle root is added, can no longer claim under any circumstances", async () => {
      const address = Object.keys(data)[Object.keys(data).length - 1];
      const amount = data[address].toString();
      const leaf = Buffer.from(
        ethers.utils
          .solidityKeccak256(["address", "uint256"], [address, amount])
          .substr(2),
        "hex"
      );
      const proof = tree.getHexProof(leaf);

      expect(await presale.canClaim(address, amount, proof)).to.equal(true);

      await usdt.transfer(address, parse(Number(amount * 500).toString(), 6))
      await usdt.connect(alice).approve(presale.address, parse(Number(amount * 500).toString()))

      await presale.connect(alice).claimParadox(address, amount, parse(Number(500 * amount).toString(), 6), proof)

      expect(await format(await paradox.balanceOf(address), 18).toFixed(0)).to.equal('625')
      expect(await presale.canClaim(address, amount, proof)).to.equal(false);

      [root, tree] = genMTree(data2)

      await presale.updateRoot(root);

      await expect(presale.connect(alice).claimParadox(address, amount, parse(Number(500 * amount).toString(), 6), proof)).to.be.revertedWith("Invalid Claim")
    })
    // for this one, just add a hardhat wallet public key to the data and a number amount in the field
    it("Claims and a new merkle root is added, new additions can claim", async () => {
      let address = Object.keys(data)[Object.keys(data).length - 1];
      let amount = data[address].toString();
      let leaf = Buffer.from(
        ethers.utils
          .solidityKeccak256(["address", "uint256"], [address, amount])
          .substr(2),
        "hex"
      );
      let proof = tree.getHexProof(leaf);

      expect(await presale.canClaim(address, amount, proof)).to.equal(true);

      await usdt.transfer(address, parse(Number(amount * 500).toString(), 6))
      await usdt.connect(alice).approve(presale.address, parse(Number(amount * 500).toString()))

      await presale.connect(alice).claimParadox(address, amount, parse(Number(250 * amount).toString(), 6), proof)

      expect(await format(await paradox.balanceOf(address), 18).toFixed(0)).to.equal('313')
      expect(await presale.canClaim(address, amount, proof)).to.equal(true);

      [root, tree] = genMTree(data2)

      await presale.updateRoot(root);

      await network.provider.send("evm_increaseTime", [600]);
      await network.provider.send("evm_mine");

      const address2 = Object.keys(data2)[Object.keys(data2).length - 1];
      const amount2 = data2[address2].toString();
      const leaf2 = Buffer.from(
        ethers.utils
          .solidityKeccak256(["address", "uint256"], [address2, amount2])
          .substr(2),
        "hex"
      );
      const proof2 = tree.getHexProof(leaf2);

      await usdt.transfer(address2, parse(Number(amount2 * 500).toString(), 6))
      await usdt.connect(bob).approve(presale.address, parse(Number(amount2 * 500).toString()))

      address = Object.keys(data2)[Object.keys(data2).length - 2];
      amount = data2[address].toString();
      leaf = Buffer.from(
        ethers.utils
          .solidityKeccak256(["address", "uint256"], [address, amount])
          .substr(2),
        "hex"
      );
      proof = tree.getHexProof(leaf);
      
      await presale.connect(bob).claimParadox(address2, amount2, parse(Number(500 * amount2).toString(), 6), proof2)

      expect(await format(await paradox.balanceOf(address2), 18).toFixed(0)).to.equal('6250')

      await presale.connect(alice).claimParadox(address, amount, parse(Number(250 * amount).toString(), 6), proof)
    })
    it("Goes through a full vesting cycle", async () => {
      [root, tree] = genMTree(data3)

      await presale.updateRoot(root);
      // 1 NFT -> 625 (10%)
      // 50 NFT -> 31,250 (10%)
      let address = Object.keys(data3)[Object.keys(data3).length - 1];
      let amount = data3[address].toString();
      let leaf = Buffer.from(
        ethers.utils
          .solidityKeccak256(["address", "uint256"], [address, amount])
          .substr(2),
        "hex"
      );
      let proof = tree.getHexProof(leaf);

      expect(await presale.canClaim(address, amount, proof)).to.equal(true);

      await usdt.transfer(address, parse(Number(amount * 500).toString(), 6))
      await usdt.connect(bob).approve(presale.address, parse(Number(amount * 500).toString()))

      await presale.connect(bob).claimParadox(address, amount, parse(Number(500 * amount).toString(), 6), proof)

      expect(await format(await paradox.balanceOf(address), 18).toFixed(0)).to.equal('31250')
      expect(await presale.canClaim(address, amount, proof)).to.equal(false);

      const lock = await presale.locks(bob.address);
      expect(format(lock.max, 6)).to.equal(25_000)
      expect(format(lock.total, 18)).to.equal(281_250)

      // start vesting cycle
      expect(await presale.pendingVestedClaim(bob.address)).to.equal('0')

      await network.provider.send("evm_increaseTime", [2592000]);
      await network.provider.send("evm_mine");

      expect(format(await presale.pendingVestedClaim(bob.address), 18)).to.equal(31250)
      await presale.connect(bob).claimVested()
      expect(await format(await paradox.balanceOf(bob.address), 18).toFixed(0)).to.equal('62500')

      await network.provider.send("evm_increaseTime", [2592000]);
      await network.provider.send("evm_mine");

      expect(format(await presale.pendingVestedClaim(bob.address), 18)).to.equal(31250)
      await presale.connect(bob).claimVested()
      expect(await format(await paradox.balanceOf(bob.address), 18).toFixed(0)).to.equal('93750')

      await network.provider.send("evm_increaseTime", [2592000]);
      await network.provider.send("evm_mine");

      expect(format(await presale.pendingVestedClaim(bob.address), 18)).to.equal(31250)
      await presale.connect(bob).claimVested()
      expect(await format(await paradox.balanceOf(bob.address), 18).toFixed(0)).to.equal('125000')

      await network.provider.send("evm_increaseTime", [5184000]);
      await network.provider.send("evm_mine");

      expect(format(await presale.pendingVestedClaim(bob.address), 18)).to.equal(62500)
      await presale.connect(bob).claimVested()
      expect(await format(await paradox.balanceOf(bob.address), 18).toFixed(0)).to.equal('187500')

      await network.provider.send("evm_increaseTime", [5184000]);
      await network.provider.send("evm_mine");

      expect(format(await presale.pendingVestedClaim(bob.address), 18)).to.equal(62500)
      await presale.connect(bob).claimVested()
      expect(await format(await paradox.balanceOf(bob.address), 18).toFixed(0)).to.equal('250000')

      await network.provider.send("evm_increaseTime", [2592000]);
      await network.provider.send("evm_mine");

      expect(format(await presale.pendingVestedClaim(bob.address), 18)).to.equal(31250)
      await presale.connect(bob).claimVested()
      expect(await format(await paradox.balanceOf(bob.address), 18).toFixed(0)).to.equal('281250')

      expect(format(await presale.pendingVestedClaim(bob.address), 18)).to.equal(0)
      await presale.connect(bob).claimVested()
      expect(await format(await paradox.balanceOf(bob.address), 18).toFixed(0)).to.equal('281250')

      

    })
});
